import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './QRScanner.css';

const QRScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  
  const [event, setEvent] = useState(null);
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'upload'
  const [scanning, setScanning] = useState(false);
  const [manualTicketId, setManualTicketId] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });
  const [filter, setFilter] = useState('all'); // 'all', 'present', 'absent'
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/attendance`);
      setEvent(data.event);
      setAttendance(data.participants);
      calculateStats(data.participants);
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast.error('Failed to load event data');
    }
  };

  const calculateStats = (participants) => {
    const present = participants.filter(p => p.attendance).length;
    const total = participants.length;
    setStats({ present, absent: total - present, total });
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanFrame();
      }
    } catch (err) {
      toast.error('Camera access denied or not available');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Continuously read frames from the video and scan for QR
  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        handleScan({ text: code.data });
        return; // pause loop while processing
      }
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Start/stop camera when mode changes
  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanMode]);

  const handleScan = async (result) => {
    if (result && !scanning) {
      setScanning(true);
      try {
        const scannedData = JSON.parse(result.text);
        await markAttendance(scannedData.ticketId, 'camera');
      } catch (error) {
        toast.error('Invalid QR code format');
      } finally {
        setTimeout(() => {
          setScanning(false);
          animFrameRef.current = requestAnimationFrame(scanFrame); // resume scanning
        }, 2000);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Create an image from the file
      const image = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      image.onload = async () => {
        // Draw image to canvas to get pixel data
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        URL.revokeObjectURL(imageUrl);
        
        if (code) {
          try {
            const scannedData = JSON.parse(code.data);
            if (scannedData.ticketId) {
              await markAttendance(scannedData.ticketId, 'upload');
            } else {
              toast.error('QR code does not contain a valid ticket');
            }
          } catch (parseError) {
            // Maybe the QR just contains the ticket ID directly
            await markAttendance(code.data.trim(), 'upload');
          }
        } else {
          toast.error('Could not detect a QR code in the image. Try a clearer photo.');
        }
      };
      
      image.onerror = () => {
        toast.error('Failed to load the image file');
        URL.revokeObjectURL(imageUrl);
      };
      
      image.src = imageUrl;
    } catch (error) {
      toast.error('Failed to process QR code image');
    }
    
    // Reset file input so same file can be uploaded again
    e.target.value = '';
  };

  const handleManualEntry = async () => {
    if (!manualTicketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    await markAttendance(manualTicketId.trim(), 'manual');
    setManualTicketId('');
  };

  const markAttendance = async (ticketId, method) => {
    try {
      const { data } = await api.post(`/events/${eventId}/mark-attendance`, {
        ticketId,
        method
      });

      toast.success(`✅ ${data.participant.firstName} ${data.participant.lastName} - Attendance marked!`);
      
      // Update attendance list
      setAttendance(prev => prev.map(p => 
        p.ticketId === ticketId ? { ...p, attendance: true, attendanceTime: new Date() } : p
      ));
      
      calculateStats(attendance.map(p => 
        p.ticketId === ticketId ? { ...p, attendance: true } : p
      ));

      fetchEventData(); // Refresh data
    } catch (error) {
      if (error.response?.data?.message === 'Attendance already marked') {
        toast.warning('⚠️ Attendance already marked for this participant');
      } else {
        toast.error(error.response?.data?.message || 'Failed to mark attendance');
      }
    }
  };

  const handleManualOverride = async () => {
    if (!overrideReason.trim()) {
      toast.error('Please provide a reason for manual override');
      return;
    }

    try {
      await api.post(`/events/${eventId}/manual-override`, {
        participantId: selectedParticipant._id,
        reason: overrideReason,
        action: selectedParticipant.attendance ? 'unmark' : 'mark'
      });

      toast.success('Manual override successful');
      setShowManualOverride(false);
      setSelectedParticipant(null);
      setOverrideReason('');
      fetchEventData();
    } catch (error) {
      toast.error('Failed to apply manual override');
    }
  };

  const exportAttendance = async () => {
    try {
      const response = await api.get(`/events/${eventId}/export-attendance`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${event?.name}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Attendance report exported successfully');
    } catch (error) {
      toast.error('Failed to export attendance report');
    }
  };

  const filteredAttendance = attendance.filter(p => {
    const matchesFilter = filter === 'all' || 
      (filter === 'present' && p.attendance) || 
      (filter === 'absent' && !p.attendance);
    
    const matchesSearch = searchQuery === '' || 
      p.participant.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.participant.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ticketId.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (!event) return <div className="loading">Loading...</div>;

  return (
    <div className="qr-scanner-page">
      <div className="scanner-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          ← Back
        </button>
        <h1>📱 QR Scanner - {event.name}</h1>
        <button onClick={exportAttendance} className="btn btn-primary">
          📊 Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Registered</div>
        </div>
        <div className="stat-card present">
          <div className="stat-value">{stats.present}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card absent">
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
        <div className="stat-card percentage">
          <div className="stat-value">
            {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
          </div>
          <div className="stat-label">Attendance Rate</div>
        </div>
      </div>

      {/* Scanner Section */}
      <div className="scanner-section card">
        <div className="scan-mode-selector">
          <button
            className={`mode-btn ${scanMode === 'camera' ? 'active' : ''}`}
            onClick={() => setScanMode('camera')}
          >
            📷 Camera Scan
          </button>
          <button
            className={`mode-btn ${scanMode === 'upload' ? 'active' : ''}`}
            onClick={() => setScanMode('upload')}
          >
            📤 Upload QR
          </button>
          <button
            className={`mode-btn ${scanMode === 'manual' ? 'active' : ''}`}
            onClick={() => setScanMode('manual')}
          >
            ⌨️ Manual Entry
          </button>
        </div>

        {scanMode === 'camera' && (
          <div className="camera-scanner">
            <video
              ref={videoRef}
              style={{ width: '100%', maxWidth: '500px', display: 'block', margin: '0 auto' }}
              muted
              playsInline
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {scanning && <div className="scanning-indicator">Scanning...</div>}
          </div>
        )}

        {scanMode === 'upload' && (
          <div className="upload-scanner">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary btn-lg"
            >
              📤 Upload QR Code Image
            </button>
            <p className="hint">Upload a screenshot or photo of the QR code</p>
          </div>
        )}

        {scanMode === 'manual' && (
          <div className="manual-entry">
            <input
              type="text"
              value={manualTicketId}
              onChange={(e) => setManualTicketId(e.target.value)}
              placeholder="Enter Ticket ID"
              className="ticket-input"
              onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
            />
            <button onClick={handleManualEntry} className="btn btn-primary">
              ✓ Mark Present
            </button>
          </div>
        )}
      </div>

      {/* Attendance List */}
      <div className="attendance-section card">
        <div className="attendance-header">
          <h2>📋 Attendance List</h2>
          
          <div className="attendance-filters">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search by name or ticket ID"
              className="search-input"
            />
            
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">All ({attendance.length})</option>
              <option value="present">Present ({stats.present})</option>
              <option value="absent">Absent ({stats.absent})</option>
            </select>
          </div>
        </div>

        <div className="attendance-table">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Ticket ID</th>
                <th>Email</th>
                <th>Marked At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record) => (
                <tr key={record._id} className={record.attendance ? 'present-row' : 'absent-row'}>
                  <td>
                    {record.attendance ? (
                      <span className="status-badge present">✓ Present</span>
                    ) : (
                      <span className="status-badge absent">✗ Absent</span>
                    )}
                  </td>
                  <td className="name-cell">
                    {record.participant.firstName} {record.participant.lastName}
                  </td>
                  <td className="ticket-cell">{record.ticketId}</td>
                  <td>{record.participant.email}</td>
                  <td>
                    {record.attendance && record.attendanceTime ? (
                      new Date(record.attendanceTime).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedParticipant(record);
                        setShowManualOverride(true);
                      }}
                      className="btn btn-sm btn-secondary"
                    >
                      ⚙️ Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAttendance.length === 0 && (
            <div className="no-results">
              No participants found matching your criteria
            </div>
          )}
        </div>
      </div>

      {/* Manual Override Modal */}
      {showManualOverride && selectedParticipant && (
        <div className="modal-overlay" onClick={() => setShowManualOverride(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Manual Override - Attendance</h3>
            <p>
              <strong>{selectedParticipant.participant.firstName} {selectedParticipant.participant.lastName}</strong>
              <br />
              Ticket ID: {selectedParticipant.ticketId}
              <br />
              Current Status: {selectedParticipant.attendance ? 'Present' : 'Absent'}
            </p>

            <div className="form-group">
              <label>Reason for Manual Override *</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="E.g., QR code not scanning, technical issue, lost ticket, etc."
                rows="4"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowManualOverride(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleManualOverride} className="btn btn-primary">
                {selectedParticipant.attendance ? 'Unmark Attendance' : 'Mark Present'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
