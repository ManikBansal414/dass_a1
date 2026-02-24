const axios = require('axios');

/**
 * Send an event announcement to a Discord channel via webhook.
 * Called when an event is published (status changed to 'Published').
 * 
 * @param {string} webhookUrl - The Discord webhook URL from organizer profile
 * @param {object} event - The event document
 * @param {object} organizer - The organizer document
 */
exports.sendDiscordNotification = async (webhookUrl, event, organizer) => {
  if (!webhookUrl) {
    console.log('  No Discord webhook configured for organizer:', organizer.name);
    return false;
  }

  try {
    const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const startTime = new Date(event.startDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const deadline = new Date(event.registrationDeadline).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const embed = {
      title: ` ${event.name}`,
      description: event.description.length > 300
        ? event.description.substring(0, 300) + '...'
        : event.description,
      color: event.eventType === 'Merchandise' ? 0xf5576c : 0x667eea,
      fields: [
        {
          name: ' Date',
          value: `${startDate} at ${startTime}`,
          inline: true
        },
        {
          name: ' Type',
          value: event.eventType,
          inline: true
        },
        {
          name: ' Fee',
          value: event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free',
          inline: true
        },
        {
          name: ' Eligibility',
          value: event.eligibility || 'All',
          inline: true
        },
        {
          name: ' Registration Deadline',
          value: deadline,
          inline: true
        }
      ],
      footer: {
        text: `Posted by ${organizer.name} (${organizer.category})`
      },
      timestamp: new Date().toISOString()
    };

    // Add tags if present
    if (event.tags && event.tags.length > 0) {
      embed.fields.push({
        name: ' Tags',
        value: event.tags.join(', '),
        inline: false
      });
    }

    // Add registration limit if set
    if (event.registrationLimit) {
      embed.fields.push({
        name: ' Capacity',
        value: `${event.registrationLimit} spots`,
        inline: true
      });
    }

    // Add merchandise details if applicable
    if (event.eventType === 'Merchandise' && event.merchandiseDetails) {
      const merchInfo = [];
      if (event.merchandiseDetails.size?.length > 0) {
        merchInfo.push(`Sizes: ${event.merchandiseDetails.size.join(', ')}`);
      }
      if (event.merchandiseDetails.color?.length > 0) {
        merchInfo.push(`Colors: ${event.merchandiseDetails.color.join(', ')}`);
      }
      if (event.merchandiseDetails.stockQuantity) {
        merchInfo.push(`Stock: ${event.merchandiseDetails.stockQuantity}`);
      }
      if (merchInfo.length > 0) {
        embed.fields.push({
          name: ' Merchandise Details',
          value: merchInfo.join('\n'),
          inline: false
        });
      }
    }

    const payload = {
      content: ` **New Event Published!** Register now!`,
      embeds: [embed]
    };

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(` Discord notification sent for event: ${event.name}`);
    return true;
  } catch (error) {
    console.error(' Discord webhook error:', error.response?.data || error.message);
    return false;
  }
};
