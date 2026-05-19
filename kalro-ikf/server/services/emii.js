/**
 * External Media Incident Integration (EMII) Service
 * Physical Boundary Guard - Detects unauthorized USB/removable media access
 *
 * Features:
 * - USB device detection and monitoring
 * - Institutional knowledge validation against authorized media registry
 * - Impact assessment based on station criticality and asset sensitivity
 * - Real-time alerting via WebSockets
 * - Integration with incident response system
 */

let usbDetect;
try {
  usbDetect = require('usb-detection');
} catch (err) {
  console.warn('[EMII] usb-detection is unavailable. USB monitoring will be disabled.', err.message);
}
const { read, write } = require('../store');
const alertEnrichment = require('./alertEnrichment');

/**
 * Authorized Media Registry structure:
 * {
 *   serialNumber: {
 *     vid: string,
 *     pid: string,
 *     serialNumber: string,
 *     deviceName: string,
 *     authorizedUsers: [userId],
 *     authorizedStations: [stationId],
 *     lastSeen: timestamp,
 *     status: 'active' | 'revoked'
 *   }
 * }
 */

/**
 * Station criticality weights for impact assessment
 */
const STATION_CRITICALITY = {
  'HQ': 2.0,
  'Research Lab': 1.8,
  'Field Station': 1.0,
  'Admin Office': 1.2,
  'Data Center': 2.5
};

/**
 * Asset sensitivity levels
 */
const ASSET_SENSITIVITY = {
  'Genetic Research Database': 3.0,
  'Research Data': 2.5,
  'Administrative Data': 1.5,
  'Public Data': 1.0
};

/**
 * Initialize USB detection monitoring
 */
function initializeUSBMonitoring(io) {
  if (!usbDetect) {
    console.warn('[EMII] USB monitoring disabled because usb-detection is unavailable.');
    return;
  }

  console.log('[EMII] Initializing USB detection monitoring...');

  // Start monitoring USB devices
  usbDetect.startMonitoring();

  // Listen for device addition
  usbDetect.on('add', (device) => {
    console.log('[EMII] USB device detected:', device);
    handleUSBInsertion(device, io);
  });

  // Listen for device removal
  usbDetect.on('remove', (device) => {
    console.log('[EMII] USB device removed:', device);
    handleUSBRemoval(device, io);
  });

  console.log('[EMII] USB monitoring initialized successfully');
}

/**
 * Handle USB device insertion
 */
function handleUSBInsertion(device, io) {
  const eventData = {
    eventType: 'usb_insertion',
    device: {
      vid: device.vendorId?.toString(16).toUpperCase(),
      pid: device.productId?.toString(16).toUpperCase(),
      serialNumber: device.serialNumber || 'unknown',
      deviceName: device.deviceName || 'Unknown Device'
    },
    timestamp: new Date().toISOString(),
    stationId: process.env.STATION_ID || 'Unknown',
    workstationId: process.env.WORKSTATION_ID || 'Unknown'
  };

  // Analyze the device
  analyzeUSBDevice(eventData, io);
}

/**
 * Handle USB device removal
 */
function handleUSBRemoval(device, io) {
  const eventData = {
    eventType: 'usb_removal',
    device: {
      vid: device.vendorId?.toString(16).toUpperCase(),
      pid: device.productId?.toString(16).toUpperCase(),
      serialNumber: device.serialNumber || 'unknown'
    },
    timestamp: new Date().toISOString(),
    stationId: process.env.STATION_ID || 'Unknown'
  };

  // Log the removal event
  logUSBEvent(eventData);

  // Notify connected clients
  if (io) {
    io.emit('usb_event', eventData);
  }
}

/**
 * Analyze USB device against institutional knowledge
 */
function analyzeUSBDevice(eventData, io) {
  const registry = read('authorized_media') || {};
  const deviceKey = eventData.device.serialNumber;
  const isAuthorized = registry[deviceKey] && registry[deviceKey].status === 'active';

  // Calculate impact assessment
  const impactScore = calculateImpactScore(eventData, isAuthorized);

  // Determine severity
  const severity = determineSeverity(isAuthorized, impactScore);

  // Create incident data
  const incidentData = {
    id: `emii-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: isAuthorized ? 'authorized_media_access' : 'unauthorized_media_access',
    title: isAuthorized
      ? `Authorized USB Device Connected: ${eventData.device.deviceName}`
      : `Unauthorized USB Device Detected: ${eventData.device.deviceName}`,
    severity: severity,
    status: 'active',
    description: generateIncidentDescription(eventData, isAuthorized, registry[deviceKey]),
    entities: {
      devices: [{
        type: 'usb',
        vid: eventData.device.vid,
        pid: eventData.device.pid,
        serialNumber: eventData.device.serialNumber,
        deviceName: eventData.device.deviceName
      }],
      stations: [eventData.stationId],
      workstations: [eventData.workstationId]
    },
    reported_by: 'system',
    assigned_to: null,
    created_at: eventData.timestamp,
    impact_score: impactScore,
    emii_data: eventData
  };

  // Log the event
  logUSBEvent(eventData);

  // If unauthorized, create an incident
  if (!isAuthorized) {
    createEMIIIncident(incidentData);
  }

  // Notify connected clients
  if (io) {
    io.emit('emii_alert', {
      ...incidentData,
      alert_type: 'external_media',
      requires_attention: !isAuthorized
    });
  }

  return incidentData;
}

/**
 * Calculate impact score based on station criticality and asset sensitivity
 */
function calculateImpactScore(eventData, isAuthorized) {
  if (isAuthorized) return 0; // No impact for authorized devices

  let score = 1.0;

  // Station criticality multiplier
  const stationCriticality = STATION_CRITICALITY[eventData.stationId] || 1.0;
  score *= stationCriticality;

  // Asset sensitivity (simplified - in production would check actual workstation access)
  // For now, assume higher sensitivity for research stations
  const assetSensitivity = eventData.stationId.includes('Research') ||
                          eventData.stationId.includes('Lab') ? 2.5 : 1.5;
  score *= assetSensitivity;

  return Math.min(score, 5.0); // Cap at 5.0
}

/**
 * Determine severity based on authorization and impact
 */
function determineSeverity(isAuthorized, impactScore) {
  if (isAuthorized) return 'low';

  if (impactScore >= 4.0) return 'critical';
  if (impactScore >= 2.5) return 'high';
  if (impactScore >= 1.5) return 'medium';
  return 'low';
}

/**
 * Generate incident description
 */
function generateIncidentDescription(eventData, isAuthorized, registryEntry) {
  const device = eventData.device;

  if (isAuthorized && registryEntry) {
    return `Authorized USB device connected at ${eventData.stationId}. ` +
           `Device: ${device.deviceName} (VID:${device.vid}, PID:${device.pid}, SN:${device.serialNumber}). ` +
           `Authorized users: ${registryEntry.authorizedUsers?.join(', ') || 'N/A'}. ` +
           `Last seen: ${registryEntry.lastSeen || 'First time'}.`;
  } else {
    return `Unauthorized USB device detected at ${eventData.stationId}. ` +
           `Device: ${device.deviceName} (VID:${device.vid}, PID:${device.pid}, SN:${device.serialNumber}). ` +
           `This device is not registered in the Authorized Media Registry. ` +
           `Immediate investigation recommended.`;
  }
}

/**
 * Create EMII incident in the system
 */
function createEMIIIncident(incidentData) {
  const incidents = read('incidents') || [];
  incidents.push(incidentData);
  write('incidents', incidents);

  // Trigger alert enrichment for defensive routine suggestions
  setTimeout(() => {
    alertEnrichment.enrichAlert({
      id: incidentData.id,
      type: 'external_media',
      severity: incidentData.severity,
      description: incidentData.description,
      entities: incidentData.entities
    });
  }, 1000);
}

/**
 * Log USB event to audit logs
 */
function logUSBEvent(eventData) {
  const auditLogs = read('audit_logs') || [];
  auditLogs.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: eventData.timestamp,
    action: 'usb_event',
    user_id: 'system',
    details: eventData,
    ip_address: 'localhost',
    user_agent: 'EMII-Service'
  });

  // Keep only last 1000 audit logs
  if (auditLogs.length > 1000) {
    auditLogs.splice(0, auditLogs.length - 1000);
  }

  write('audit_logs', auditLogs);
}

/**
 * Get authorized media registry
 */
function getAuthorizedMediaRegistry() {
  return read('authorized_media') || {};
}

/**
 * Add device to authorized media registry
 */
function addAuthorizedDevice(deviceData) {
  const registry = read('authorized_media') || {};

  registry[deviceData.serialNumber] = {
    vid: deviceData.vid,
    pid: deviceData.pid,
    serialNumber: deviceData.serialNumber,
    deviceName: deviceData.deviceName,
    authorizedUsers: deviceData.authorizedUsers || [],
    authorizedStations: deviceData.authorizedStations || [],
    added_by: deviceData.added_by || 'system',
    added_at: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    status: 'active'
  };

  write('authorized_media', registry);
  return registry[deviceData.serialNumber];
}

/**
 * Revoke device authorization
 */
function revokeDeviceAuthorization(serialNumber, revokedBy = 'system') {
  const registry = read('authorized_media') || {};

  if (registry[serialNumber]) {
    registry[serialNumber].status = 'revoked';
    registry[serialNumber].revoked_by = revokedBy;
    registry[serialNumber].revoked_at = new Date().toISOString();
    write('authorized_media', registry);
    return true;
  }

  return false;
}

/**
 * Update device last seen timestamp
 */
function updateDeviceLastSeen(serialNumber) {
  const registry = read('authorized_media') || {};

  if (registry[serialNumber]) {
    registry[serialNumber].lastSeen = new Date().toISOString();
    write('authorized_media', registry);
  }
}

/**
 * Get EMII statistics
 */
function getEMIIStats() {
  const incidents = read('incidents') || [];
  const registry = read('authorized_media') || {};

  const emiiIncidents = incidents.filter(inc =>
    inc.type === 'unauthorized_media_access' ||
    inc.type === 'authorized_media_access'
  );

  const stats = {
    total_devices_registered: Object.keys(registry).length,
    active_devices: Object.values(registry).filter(d => d.status === 'active').length,
    revoked_devices: Object.values(registry).filter(d => d.status === 'revoked').length,
    total_emii_incidents: emiiIncidents.length,
    unauthorized_incidents: emiiIncidents.filter(inc => inc.type === 'unauthorized_media_access').length,
    authorized_events: emiiIncidents.filter(inc => inc.type === 'authorized_media_access').length,
    incidents_by_severity: {
      critical: emiiIncidents.filter(inc => inc.severity === 'critical').length,
      high: emiiIncidents.filter(inc => inc.severity === 'high').length,
      medium: emiiIncidents.filter(inc => inc.severity === 'medium').length,
      low: emiiIncidents.filter(inc => inc.severity === 'low').length
    },
    recent_incidents: emiiIncidents
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
  };

  return stats;
}

/**
 * Stop USB monitoring
 */
function stopUSBMonitoring() {
  if (usbDetect && typeof usbDetect.stopMonitoring === 'function') {
    usbDetect.stopMonitoring();
    console.log('[EMII] USB monitoring stopped');
  }
}

module.exports = {
  initializeUSBMonitoring,
  getAuthorizedMediaRegistry,
  addAuthorizedDevice,
  revokeDeviceAuthorization,
  updateDeviceLastSeen,
  getEMIIStats,
  stopUSBMonitoring,
  analyzeUSBDevice,
  logUSBEvent
};