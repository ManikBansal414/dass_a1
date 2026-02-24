import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import './DiscussionForum.css';

const DiscussionForum = ({ eventId }) => {
  const { user } = useContext(AuthContext);
  const [discussions, setDiscussions] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (eventId) {
      fetchDiscussions();
      // Poll for new messages every 10 seconds
      const interval = setInterval(fetchDiscussions, 10000);
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchDiscussions = async () => {
    try {
      setError(null);
      const { data } = await api.get(`/events/${eventId}/discussions`);
      if (data.success) {
        setDiscussions(data.discussions || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      if (error.response?.status === 403) {
        setError('You must be registered for this event to view discussions');
      } else if (error.response?.status !== 404) {
        setError(error.response?.data?.message || 'Failed to load discussions');
      }
      setDiscussions([]);
      setLoading(false);
    }
  };

  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const { data } = await api.post(`/events/${eventId}/discussions`, {
        message: newMessage,
        isAnnouncement,
        parentMessage: replyTo,
      });
      if (data.success) {
        setNewMessage('');
        setIsAnnouncement(false);
        setReplyTo(null);
        fetchDiscussions();
        toast.success('Message posted successfully!');
      }
    } catch (error) {
      console.error('Error posting message:', error);
      toast.error(error.response?.data?.message || 'Failed to post message');
    }
  };

  const handlePin = async (id) => {
    try {
      const response = await api.put(`/events/${eventId}/discussions/${id}/pin`);
      if (response.data.success) {
        await fetchDiscussions();
        toast.success('Message pin status updated');
      }
    } catch (error) {
      console.error('Pin error:', error);
      toast.error(error.response?.data?.message || 'Failed to update pin status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await api.delete(`/events/${eventId}/discussions/${id}`);
      if (response.data.success) {
        await fetchDiscussions();
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleReact = async (id, emoji) => {
    try {
      const response = await api.post(`/events/${eventId}/discussions/${id}/react`, { emoji });
      if (response.data.success) {
        await fetchDiscussions();
      }
    } catch (error) {
      console.error('React error:', error);
      toast.error(error.response?.data?.message || 'Failed to add reaction');
    }
  };

  const isOrganizer = user?.role === 'organizer';

  if (loading) {
    return <div className="loading">Loading discussions...</div>;
  }

  if (error) {
    return (
      <div className="discussion-forum">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="discussion-forum">
      <h3>Discussion Forum</h3>
      
      {/* Post Message Form */}
      <form onSubmit={handlePostMessage} className="post-form">
        {replyTo && (
          <div className="reply-indicator">
            Replying to message... <button type="button" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={replyTo ? "Type your reply..." : "Ask a question or start a discussion..."}
          rows="3"
          required
        />
        
        <div className="post-actions">
          {isOrganizer && (
            <label className="announcement-checkbox">
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
              />
              Post as Announcement
            </label>
          )}
          <button type="submit" className="btn btn-primary">
            {replyTo ? 'Reply' : 'Post Message'}
          </button>
        </div>
      </form>

      {/* Messages List */}
      <div className="messages-list">
        {discussions.length === 0 ? (
          <div className="no-messages">
            No messages yet. Be the first to start a discussion!
          </div>
        ) : (
          discussions
            .filter(d => !d.parentMessage)
            .map((discussion) => {
              const replies = discussions.filter(d => d.parentMessage && (d.parentMessage._id === discussion._id || d.parentMessage === discussion._id));
              
              return (
                <div key={discussion._id} className={`message-card ${discussion.isPinned ? 'pinned' : ''} ${discussion.isAnnouncement ? 'announcement' : ''}`}>
                  {discussion.isPinned && <span className="pin-badge">Pinned</span>}
                  {discussion.isAnnouncement && <span className="announcement-badge">Announcement</span>}
                  
                  <div className="message-header">
                    <div className="author-info">
                      <strong>
                        {discussion.author?.firstName || discussion.author?.name || 'Unknown User'}
                      </strong>
                      {discussion.authorModel === 'Organizer' && <span className="organizer-badge">Organizer</span>}
                    </div>
                    <span className="timestamp">
                      {new Date(discussion.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="message-content">{discussion.message}</div>

                  <div className="message-actions">
                    <div className="reactions">
                      {['👍', '❤️', '🎉', '🤔', '👏'].map(emoji => {
                        const count = discussion.reactions?.filter(r => r.emoji === emoji).length || 0;
                        const hasReacted = discussion.reactions?.some(
                          r => r.emoji === emoji && r.user?.toString() === user?.id
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(discussion._id, emoji)}
                            className={`reaction-btn ${hasReacted ? 'active' : ''}`}
                            style={{ display: count > 0 || emoji === '👍' ? 'inline-block' : 'none' }}
                          >
                            {emoji} {count > 0 ? count : ''}
                          </button>
                        );
                      })}
                    </div>

                    <div className="action-buttons">
                      <button onClick={() => setReplyTo(discussion._id)} className="btn-link">
                        Reply {replies.length > 0 && `(${replies.length})`}
                      </button>
                      
                      {isOrganizer && (
                        <>
                          <button onClick={() => handlePin(discussion._id)} className="btn-link">
                            {discussion.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button onClick={() => handleDelete(discussion._id)} className="btn-link delete">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="replies">
                      {replies.map(reply => (
                        <div key={reply._id} className="reply-card">
                          <div className="message-header">
                            <div className="author-info">
                              <strong>
                                {reply.author?.firstName || reply.author?.name || 'Unknown User'}
                              </strong>
                              {reply.authorModel === 'Organizer' && <span className="organizer-badge">Organizer</span>}
                            </div>
                            <span className="timestamp">
                              {new Date(reply.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="message-content">{reply.message}</div>
                          {isOrganizer && (
                            <button onClick={() => handleDelete(reply._id)} className="btn-link delete small">
                              Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

export default DiscussionForum;
