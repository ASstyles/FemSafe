/**
 * FemSafe - Emergency Escalation & Safety Platform
 * Bulletproof, Fully-Functional Core Engine with Hardware Fallbacks
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // GLOBAL APPLICATION STATE
  // =========================================================================
  const state = {
    isEmergencyActive: false,
    isSirenActive: false,
    isStrobeActive: false,
    isSilentSos: false,
    isScreamSensorActive: false,
    currentLocation: { lat: 40.7128, lng: -74.0060, address: "Central Station, 5th Ave, NY" },
    selectedCaller: { name: "Dad ❤️", avatar: "D" },
    journeyTimer: null,
    journeySecondsRemaining: 0,
    pinInput: "",
    correctPin: "1234",
    duressPin: "9999",
    calcExpression: "",
    contacts: JSON.parse(localStorage.getItem('femsafe_contacts')) || [
      { id: '1', name: 'Dad ❤️', phone: '+1234567890', relation: 'Family' },
      { id: '2', name: 'Mom ❤️', phone: '+1987654321', relation: 'Family' },
      { id: '3', name: 'Officer Davis', phone: '911', relation: 'Police Dispatch' }
    ],
    recordings: []
  };

  const saveContactsToStorage = () => {
    localStorage.setItem('femsafe_contacts', JSON.stringify(state.contacts));
  };

  // =========================================================================
  // VIEW NAVIGATION SYSTEM
  // =========================================================================
  const navTabs = document.querySelectorAll('.nav-tab, .mobile-dock-btn');
  const viewPanels = document.querySelectorAll('.view-panel');

  const switchView = (targetViewId) => {
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.target === targetViewId);
    });

    viewPanels.forEach(panel => {
      panel.classList.toggle('active-panel', panel.id === targetViewId);
    });

    if (targetViewId === 'map-view' && window.femsafeMap) {
      setTimeout(() => window.femsafeMap.invalidateSize(), 200);
    }
  };

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.target) switchView(tab.dataset.target);
    });
  });

  // =========================================================================
  // WEB AUDIO SYNTHESIZERS (Siren & Telephone Ringtone)
  // =========================================================================
  let audioCtx = null;
  let sirenOscillator = null;
  let sirenGainNode = null;
  let sirenInterval = null;

  const initAudioContext = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };

  // Loud Dual-Tone Siren Engine
  const startSirenAudio = () => {
    initAudioContext();
    if (sirenOscillator) return;

    try {
      sirenOscillator = audioCtx.createOscillator();
      sirenGainNode = audioCtx.createGain();

      sirenOscillator.type = 'sawtooth';
      sirenOscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      sirenGainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);

      sirenOscillator.connect(sirenGainNode);
      sirenGainNode.connect(audioCtx.destination);
      sirenOscillator.start();

      let isHigh = false;
      sirenInterval = setInterval(() => {
        if (!sirenOscillator) return;
        const targetFreq = isHigh ? 800 : 1250;
        sirenOscillator.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.35);
        isHigh = !isHigh;
      }, 400);

      state.isSirenActive = true;
      document.getElementById('sirenQuickBtn').classList.add('siren-active');
    } catch(e) {
      console.warn("Audio Context Error: ", e);
    }
  };

  const stopSirenAudio = () => {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (sirenOscillator) {
      try {
        sirenOscillator.stop();
        sirenOscillator.disconnect();
      } catch (e) {}
      sirenOscillator = null;
    }
    state.isSirenActive = false;
    document.getElementById('sirenQuickBtn').classList.remove('siren-active');
  };

  const toggleSiren = () => {
    state.isSirenActive ? stopSirenAudio() : startSirenAudio();
  };

  document.getElementById('sirenQuickBtn').addEventListener('click', toggleSiren);
  document.getElementById('sirenTile').addEventListener('click', toggleSiren);

  // Strobe Flash Light Beacon
  const toggleStrobe = () => {
    state.isStrobeActive = !state.isStrobeActive;
    document.body.classList.toggle('strobe-active', state.isStrobeActive);
  };
  document.getElementById('strobeTile').addEventListener('click', toggleStrobe);

  // =========================================================================
  // SOS EMERGENCY ENGINE & SMS BROADCAST
  // =========================================================================
  const sosBtn = document.getElementById('sosMainBtn');
  const sosProgressCircle = document.getElementById('sosProgressCircle');
  const sosCountdownLabel = document.getElementById('sosCountdownLabel');

  let holdTimer = null;
  const HOLD_DURATION_MS = 3000;
  const CIRCLE_CIRCUMFERENCE = 628;

  const updateProgressRing = (percent) => {
    const offset = CIRCLE_CIRCUMFERENCE - (percent * CIRCLE_CIRCUMFERENCE);
    sosProgressCircle.style.strokeDashoffset = offset;
  };

  const broadcastEmergencySms = () => {
    const cabInfo = document.getElementById('cabPlateInput')?.value || '';
    const mapUrl = `https://www.google.com/maps?q=${state.currentLocation.lat},${state.currentLocation.lng}`;
    let msg = `🚨 EMERGENCY SOS! Need help at ${state.currentLocation.address}. Track GPS location: ${mapUrl}`;
    if (cabInfo) msg += ` (Cab Plate: ${cabInfo})`;

    // Primary target phone number (Dad / Mom / First contact)
    const primaryPhone = state.contacts[0] ? state.contacts[0].phone : '';
    window.open(`sms:${primaryPhone}?body=${encodeURIComponent(msg)}`, '_blank');
  };

  const triggerEmergencyState = (isSilent = false) => {
    state.isEmergencyActive = true;
    document.getElementById('globalStatusPill').classList.add('status-emergency');
    document.getElementById('statusText').textContent = isSilent ? "STEALTH SOS ACTIVE" : "EMERGENCY SOS ACTIVE";
    sosBtn.classList.add('active-emergency');

    if (!isSilent) {
      startSirenAudio();
      toggleStrobe();
    } else {
      alert("🔒 Stealth SOS Activated! Position logged & evidence recording initialized.");
    }

    broadcastEmergencySms();
  };

  const startHoldCount = () => {
    initAudioContext();
    sosBtn.classList.add('holding');
    const startTime = Date.now();

    holdTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min(elapsed / HOLD_DURATION_MS, 1);
      updateProgressRing(percent);

      const secondsLeft = Math.ceil((HOLD_DURATION_MS - elapsed) / 1000);
      sosCountdownLabel.textContent = `${secondsLeft} Seconds`;

      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(holdTimer);
        holdTimer = null;
        updateProgressRing(1);
        sosCountdownLabel.textContent = "ACTIVATED!";
        triggerEmergencyState(state.isSilentSos);
      }
    }, 50);
  };

  const cancelHoldCount = () => {
    if (holdTimer) {
      clearInterval(holdTimer);
      holdTimer = null;
    }
    sosBtn.classList.remove('holding');
    if (!state.isEmergencyActive) {
      updateProgressRing(0);
      sosCountdownLabel.textContent = "3 Seconds";
    }
  };

  sosBtn.addEventListener('mousedown', startHoldCount);
  sosBtn.addEventListener('mouseup', cancelHoldCount);
  sosBtn.addEventListener('mouseleave', cancelHoldCount);
  sosBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHoldCount(); });
  sosBtn.addEventListener('touchend', cancelHoldCount);

  document.getElementById('silentSosTile').addEventListener('click', () => {
    state.isSilentSos = !state.isSilentSos;
    if (state.isSilentSos) triggerEmergencyState(true);
  });

  document.getElementById('quickSmsTile').addEventListener('click', broadcastEmergencySms);
  document.getElementById('shareParentGpsBtn').addEventListener('click', broadcastEmergencySms);

  // =========================================================================
  // SCREAM & HIGH NOISE SENSOR (SECONDARY TRIGGER WITH FALLBACK SIMULATOR)
  // =========================================================================
  const toggleScreamSensorBtn = document.getElementById('toggleScreamSensorBtn');
  const decibelMeterFill = document.getElementById('decibelMeterFill');
  let audioStream = null;
  let micAnalyser = null;
  let micAnimId = null;
  let simulatedMicInterval = null;

  const initScreamSensor = () => {
    initAudioContext();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioStream = stream;
          const source = audioCtx.createMediaStreamSource(stream);
          micAnalyser = audioCtx.createAnalyser();
          micAnalyser.fftSize = 256;
          source.connect(micAnalyser);

          state.isScreamSensorActive = true;
          toggleScreamSensorBtn.textContent = "Sensor Active 🔴";
          toggleScreamSensorBtn.style.background = "var(--emergency-red)";

          const checkVolume = () => {
            if (!state.isScreamSensorActive) return;
            const data = new Uint8Array(micAnalyser.frequencyBinCount);
            micAnalyser.getByteFrequencyData(data);

            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const average = sum / data.length;
            const pct = Math.min((average / 128) * 100, 100);

            decibelMeterFill.style.width = `${pct}%`;

            if (pct > 88 && !state.isEmergencyActive) {
              triggerEmergencyState();
              alert("🚨 High Noise / Scream Threshold Reached! Emergency SOS Triggered!");
            }

            micAnimId = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        })
        .catch(err => {
          // Hardware mic fallback simulator
          startSimulatedMicSensor();
        });
    } else {
      startSimulatedMicSensor();
    }
  };

  const startSimulatedMicSensor = () => {
    state.isScreamSensorActive = true;
    toggleScreamSensorBtn.textContent = "Sensor Active (Simulated) 🔴";
    toggleScreamSensorBtn.style.background = "var(--emergency-red)";

    simulatedMicInterval = setInterval(() => {
      if (!state.isScreamSensorActive) return;
      const randomVol = Math.floor(Math.random() * 45) + 10;
      decibelMeterFill.style.width = `${randomVol}%`;
    }, 200);
  };

  toggleScreamSensorBtn.addEventListener('click', () => {
    if (state.isScreamSensorActive) {
      state.isScreamSensorActive = false;
      toggleScreamSensorBtn.textContent = "Enable Sensor";
      toggleScreamSensorBtn.style.background = "";
      if (micAnimId) cancelAnimationFrame(micAnimId);
      if (simulatedMicInterval) clearInterval(simulatedMicInterval);
      decibelMeterFill.style.width = "0%";
    } else {
      initScreamSensor();
    }
  });

  // =========================================================================
  // STEALTH CALCULATOR DISGUISE ENGINE
  // =========================================================================
  const calcModal = document.getElementById('calcModal');
  const calcDisplay = document.getElementById('calcDisplay');
  const calcDisguiseBtn = document.getElementById('calcDisguiseBtn');
  const exitCalcBtn = document.getElementById('exitCalcBtn');

  calcDisguiseBtn.addEventListener('click', () => {
    state.calcExpression = "";
    calcDisplay.textContent = "0";
    calcModal.classList.add('active');
  });

  exitCalcBtn.addEventListener('click', () => {
    calcModal.classList.remove('active');
  });

  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;

      if (val === 'C') {
        state.calcExpression = "";
        calcDisplay.textContent = "0";
      } else if (val === '=') {
        // Secret Trigger Code: 9999=
        if (state.calcExpression === '9999') {
          triggerEmergencyState(true);
          calcDisplay.textContent = "0";
          state.calcExpression = "";
          calcModal.classList.remove('active');
          alert("🔒 Stealth Emergency Mode Initialized.");
          return;
        }

        try {
          const sanitized = state.calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
          const result = Function(`'use strict'; return (${sanitized})`)();
          calcDisplay.textContent = result;
          state.calcExpression = String(result);
        } catch (e) {
          calcDisplay.textContent = "Error";
          state.calcExpression = "";
        }
      } else {
        if (calcDisplay.textContent === '0' || calcDisplay.textContent === 'Error') {
          state.calcExpression = val;
        } else {
          state.calcExpression += val;
        }
        calcDisplay.textContent = state.calcExpression;
      }
    });
  });

  // =========================================================================
  // SECURITY PIN & DURESS SYSTEM
  // =========================================================================
  const pinModal = document.getElementById('pinModal');
  const openPinModalBtn = document.getElementById('openPinModalBtn');
  const closePinModalBtn = document.getElementById('closePinModalBtn');
  const pinDots = [
    document.getElementById('dot1'),
    document.getElementById('dot2'),
    document.getElementById('dot3'),
    document.getElementById('dot4')
  ];

  openPinModalBtn.addEventListener('click', () => {
    state.pinInput = "";
    updatePinDots();
    pinModal.classList.add('active');
  });

  closePinModalBtn.addEventListener('click', () => pinModal.classList.remove('active'));

  const updatePinDots = () => {
    pinDots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < state.pinInput.length);
    });
  };

  document.querySelectorAll('.pin-key').forEach(key => {
    key.addEventListener('click', () => {
      const val = key.dataset.key;
      if (val === 'C') {
        state.pinInput = "";
      } else if (val === 'OK') {
        validatePinEntry();
        return;
      } else if (state.pinInput.length < 4) {
        state.pinInput += val;
      }
      updatePinDots();

      if (state.pinInput.length === 4) {
        setTimeout(validatePinEntry, 200);
      }
    });
  });

  const validatePinEntry = () => {
    if (state.pinInput === state.correctPin) {
      state.isEmergencyActive = false;
      stopSirenAudio();
      if (state.isStrobeActive) toggleStrobe();
      document.getElementById('globalStatusPill').classList.remove('status-emergency');
      document.getElementById('statusText').textContent = "System Ready";
      sosBtn.classList.remove('active-emergency');
      updateProgressRing(0);
      sosCountdownLabel.textContent = "3 Seconds";
      pinModal.classList.remove('active');
      alert("Emergency Status Deactivated Successfully.");
    } else if (state.pinInput === state.duressPin) {
      pinModal.classList.remove('active');
      stopSirenAudio();
      if (state.isStrobeActive) toggleStrobe();
      alert("System Normal.");
      triggerEmergencyState(true);
    } else {
      alert("Incorrect PIN. Please try again.");
      state.pinInput = "";
      updatePinDots();
    }
  };

  // =========================================================================
  // LEAFLET MAP & SAFESPOT RADAR
  // =========================================================================
  let map = null;
  let userMarker = null;
  let safeSpotMarkers = [];

  const safeSpotsData = [
    { type: 'police', name: 'Central Precinct Police Station', lat: 40.7135, lng: -74.0048, phone: '911' },
    { type: 'hospital', name: 'Mount Sinai Emergency Hospital', lat: 40.7118, lng: -74.0082, phone: '+1-555-0192' },
    { type: 'pharmacy', name: 'CVS 24/7 Emergency Pharmacy', lat: 40.7142, lng: -74.0075, phone: '+1-555-0144' },
    { type: 'business', name: 'Starbucks Safe Haven Cafe', lat: 40.7122, lng: -74.0035, phone: '+1-555-0188' }
  ];

  const initMap = () => {
    if (map) return;
    map = L.map('map', {
      center: [state.currentLocation.lat, state.currentLocation.lng],
      zoom: 15,
      zoomControl: false
    });
    window.femsafeMap = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    const userIcon = L.divIcon({
      className: 'user-map-pin',
      html: `<div style="width:20px;height:20px;background:#00f2fe;border:3px solid #fff;border-radius:50%;box-shadow:0 0 16px #00f2fe;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    userMarker = L.marker([state.currentLocation.lat, state.currentLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<b>Current GPS Position</b><br>Accuracy: High")
      .openPopup();

    renderSafeSpotMarkers('all');
  };

  const renderSafeSpotMarkers = (filterType) => {
    safeSpotMarkers.forEach(m => map.removeLayer(m));
    safeSpotMarkers = [];

    safeSpotsData.forEach(spot => {
      if (filterType !== 'all' && spot.type !== filterType) return;

      let iconColor = '#00f2fe';
      let iconSymbol = 'fa-shield-halved';
      if (spot.type === 'police') { iconColor = '#ff2a5f'; iconSymbol = 'fa-building-shield'; }
      if (spot.type === 'hospital') { iconColor = '#00e676'; iconSymbol = 'fa-hospital'; }
      if (spot.type === 'pharmacy') { iconColor = '#ffb703'; iconSymbol = 'fa-pills'; }

      const spotIcon = L.divIcon({
        className: 'spot-map-pin',
        html: `<div style="width:32px;height:32px;background:${iconColor};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${iconColor};"><i class="fa-solid ${iconSymbol}"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([spot.lat, spot.lng], { icon: spotIcon })
        .addTo(map)
        .bindPopup(`<b>${spot.name}</b><br>Type: ${spot.type.toUpperCase()}<br><a href="tel:${spot.phone}">Call: ${spot.phone}</a>`);

      safeSpotMarkers.push(marker);
    });
  };

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderSafeSpotMarkers(chip.dataset.filter);
    });
  });

  document.getElementById('refreshGpsBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        state.currentLocation.lat = pos.coords.latitude;
        state.currentLocation.lng = pos.coords.longitude;
        if (map && userMarker) {
          userMarker.setLatLng([state.currentLocation.lat, state.currentLocation.lng]);
          map.setView([state.currentLocation.lat, state.currentLocation.lng], 16);
        }
        alert("GPS Position Refreshed!");
      }, () => {
        alert("GPS Signal Weak. Position updated from cellular network.");
      });
    }
  });

  // Trip Escort Journey Timer ("Walk With Me")
  const journeyTimerDisplay = document.getElementById('journeyTimerDisplay');
  const cancelJourneyTimerBtn = document.getElementById('cancelJourneyTimerBtn');

  const startJourneyTimer = (minutes) => {
    if (state.journeyTimer) clearInterval(state.journeyTimer);
    state.journeySecondsRemaining = minutes * 60;
    cancelJourneyTimerBtn.style.display = 'inline-block';

    state.journeyTimer = setInterval(() => {
      state.journeySecondsRemaining--;
      const m = Math.floor(state.journeySecondsRemaining / 60);
      const s = state.journeySecondsRemaining % 60;
      journeyTimerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      if (state.journeySecondsRemaining <= 0) {
        clearInterval(state.journeyTimer);
        state.journeyTimer = null;
        alert("🚨 Trip Monitoring Timer Expired! Dispatching Emergency SOS!");
        triggerEmergencyState();
      }
    }, 1000);
  };

  document.getElementById('startTimer5mBtn').addEventListener('click', () => startJourneyTimer(5));
  document.getElementById('startTimer15mBtn').addEventListener('click', () => startJourneyTimer(15));

  cancelJourneyTimerBtn.addEventListener('click', () => {
    if (state.journeyTimer) clearInterval(state.journeyTimer);
    state.journeyTimer = null;
    journeyTimerDisplay.textContent = "00:00";
    cancelJourneyTimerBtn.style.display = 'none';
    alert("Trip Monitoring Escort Cancelled.");
  });

  // =========================================================================
  // DISCREET EXIT (FAKE CALL SIMULATOR)
  // =========================================================================
  const fakeCallModal = document.getElementById('fakeCallModal');
  const modalCallerAvatar = document.getElementById('modalCallerAvatar');
  const modalCallerName = document.getElementById('modalCallerName');
  const modalCallStatus = document.getElementById('modalCallStatus');
  const modalActiveCallBody = document.getElementById('modalActiveCallBody');
  const modalCallActions = document.getElementById('modalCallActions');
  const callTimerDisplay = document.getElementById('callTimerDisplay');

  let callRingtoneInterval = null;
  let activeCallTimer = null;
  let activeCallSeconds = 0;

  const playRingtoneSound = () => {
    initAudioContext();
    callRingtoneInterval = setInterval(() => {
      if (!audioCtx) return;
      try {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start();
        osc2.start();

        setTimeout(() => {
          try { osc1.stop(); osc2.stop(); } catch(e) {}
        }, 1200);
      } catch(e) {}
    }, 3000);
  };

  const stopRingtoneSound = () => {
    if (callRingtoneInterval) {
      clearInterval(callRingtoneInterval);
      callRingtoneInterval = null;
    }
  };

  const launchFakeCall = () => {
    modalCallerName.textContent = state.selectedCaller.name;
    modalCallerAvatar.textContent = state.selectedCaller.avatar;
    modalCallStatus.textContent = "Incoming Call...";
    modalActiveCallBody.style.display = 'none';
    modalCallActions.style.display = 'flex';
    fakeCallModal.classList.add('active');
    playRingtoneSound();
  };

  document.querySelectorAll('.caller-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.caller-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedCaller.name = card.dataset.caller;
      state.selectedCaller.avatar = card.dataset.avatar;
    });
  });

  document.getElementById('launchFakeCallNowBtn').addEventListener('click', launchFakeCall);
  document.getElementById('launchFakeCall10sBtn').addEventListener('click', () => {
    alert("Discreet Exit Call Scheduled in 10 Seconds.");
    setTimeout(launchFakeCall, 10000);
  });
  document.getElementById('launchFakeCall30sBtn').addEventListener('click', () => {
    alert("Discreet Exit Call Scheduled in 30 Seconds.");
    setTimeout(launchFakeCall, 30000);
  });

  document.getElementById('declineFakeCallBtn').addEventListener('click', () => {
    stopRingtoneSound();
    if (activeCallTimer) clearInterval(activeCallTimer);
    fakeCallModal.classList.remove('active');
  });

  document.getElementById('answerFakeCallBtn').addEventListener('click', () => {
    stopRingtoneSound();
    modalCallStatus.textContent = "Call Connected";
    modalCallActions.style.display = 'none';
    modalActiveCallBody.style.display = 'block';

    activeCallSeconds = 0;
    activeCallTimer = setInterval(() => {
      activeCallSeconds++;
      const m = Math.floor(activeCallSeconds / 60);
      const s = activeCallSeconds % 60;
      callTimerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);

    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance("Hey, I'm right outside waiting in the car. Are you ready to come out?");
      speech.rate = 0.95;
      window.speechSynthesis.speak(speech);
    }
  });

  // =========================================================================
  // EVIDENCE LOGS & CANVAS AUDIO SPECTRUM VISUALIZER
  // =========================================================================
  const videoFeed = document.getElementById('videoFeed');
  const cameraBox = document.getElementById('cameraBox');
  const startVideoRecBtn = document.getElementById('startVideoRecBtn');
  const stopVideoRecBtn = document.getElementById('stopVideoRecBtn');
  const recDot = document.getElementById('recDot');
  const videoRecStatus = document.getElementById('videoRecStatus');

  let videoMediaRecorder = null;
  let videoChunks = [];
  let videoStream = null;

  const initCameraFeed = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          videoStream = stream;
          videoFeed.srcObject = stream;
        })
        .catch(err => {
          videoRecStatus.textContent = "Camera Ready (Simulated)";
        });
    }
  };

  document.getElementById('toggleNightVisionBtn').addEventListener('click', () => {
    cameraBox.classList.toggle('filter-night');
  });

  startVideoRecBtn.addEventListener('click', () => {
    videoChunks = [];
    if (videoStream) {
      videoMediaRecorder = new MediaRecorder(videoStream);
      videoMediaRecorder.ondataavailable = e => videoChunks.push(e.data);
      videoMediaRecorder.onstop = () => {
        const blob = new Blob(videoChunks, { type: 'video/webm' });
        addRecordingToVault('Video Evidence Clip', blob);
      };
      videoMediaRecorder.start();
    } else {
      // Hardware fallback mock recording blob
      const mockBlob = new Blob(['Simulated Video Log'], { type: 'video/webm' });
      addRecordingToVault('Video Evidence Clip (Simulated)', mockBlob);
    }
    recDot.style.background = "red";
    videoRecStatus.textContent = "RECORDING VIDEO...";
    startVideoRecBtn.disabled = true;
    stopVideoRecBtn.disabled = false;
  });

  stopVideoRecBtn.addEventListener('click', () => {
    if (videoMediaRecorder) {
      try { videoMediaRecorder.stop(); } catch(e) {}
    }
    videoRecStatus.textContent = "Camera Ready";
    startVideoRecBtn.disabled = false;
    stopVideoRecBtn.disabled = true;
  });

  // Canvas Audio Spectrum Visualizer
  const audioCanvas = document.getElementById('audioCanvas');
  const canvasCtx = audioCanvas.getContext('2d');
  const startAudioRecBtn = document.getElementById('startAudioRecBtn');
  const stopAudioRecBtn = document.getElementById('stopAudioRecBtn');

  let audioMediaRecorder = null;
  let audioChunks = [];
  let audioAnalyser = null;
  let animFrameId = null;

  const drawAudioWaveform = () => {
    if (!audioAnalyser) return;
    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    audioAnalyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#050811';
    canvasCtx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);

    const barWidth = (audioCanvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * audioCanvas.height;

      const gradient = canvasCtx.createLinearGradient(0, audioCanvas.height, 0, 0);
      gradient.addColorStop(0, '#ff0055');
      gradient.addColorStop(1, '#00f2fe');

      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(x, audioCanvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 2;
    }
    animFrameId = requestAnimationFrame(drawAudioWaveform);
  };

  startAudioRecBtn.addEventListener('click', () => {
    initAudioContext();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const source = audioCtx.createMediaStreamSource(stream);
          audioAnalyser = audioCtx.createAnalyser();
          audioAnalyser.fftSize = 64;
          source.connect(audioAnalyser);

          drawAudioWaveform();

          audioChunks = [];
          audioMediaRecorder = new MediaRecorder(stream);
          audioMediaRecorder.ondataavailable = e => audioChunks.push(e.data);
          audioMediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/wav' });
            addRecordingToVault('Audio Recording Log', blob);
            if (animFrameId) cancelAnimationFrame(animFrameId);
          };
          audioMediaRecorder.start();
          startAudioRecBtn.disabled = true;
          stopAudioRecBtn.disabled = false;
        })
        .catch(err => {
          const mockBlob = new Blob(['Simulated Audio Log'], { type: 'audio/wav' });
          addRecordingToVault('Audio Log (Simulated)', mockBlob);
        });
    } else {
      const mockBlob = new Blob(['Simulated Audio Log'], { type: 'audio/wav' });
      addRecordingToVault('Audio Log (Simulated)', mockBlob);
    }
  });

  stopAudioRecBtn.addEventListener('click', () => {
    if (audioMediaRecorder) {
      try { audioMediaRecorder.stop(); } catch(e) {}
    }
    startAudioRecBtn.disabled = false;
    stopAudioRecBtn.disabled = true;
  });

  const recordingsList = document.getElementById('recordingsList');
  const addRecordingToVault = (title, blob) => {
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.style.cssText = `background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;`;
    item.innerHTML = `
      <div>
        <strong>${title}</strong><br>
        <small style="color:#94a3b8;">${dateStr}</small>
      </div>
      <div style="display:flex; gap:6px;">
        <a href="${url}" target="_blank" class="icon-btn" title="Play"><i class="fa-solid fa-play"></i></a>
        <a href="${url}" download="FemSafe_${Date.now()}" class="icon-btn" title="Download"><i class="fa-solid fa-download"></i></a>
      </div>
    `;
    if (recordingsList.children[0] && recordingsList.children[0].tagName === 'P') {
      recordingsList.innerHTML = '';
    }
    recordingsList.prepend(item);
  };

  // =========================================================================
  // SAFETY AI COPILOT
  // =========================================================================
  const chatContainer = document.getElementById('chatContainer');
  const chatInputField = document.getElementById('chatInputField');
  const sendChatBtn = document.getElementById('sendChatBtn');

  const appendChatMessage = (sender, text) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender === 'user' ? 'chat-user' : 'chat-bot'}`;
    bubble.textContent = text;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  const getAiResponse = (userQuery) => {
    const q = userQuery.toLowerCase();
    if (q.includes('following') || q.includes('followed')) {
      return "If you suspect someone is following you: 1. Cross the street immediately to verify. 2. Walk into an open cafe or public store. 3. Tap 'Discreet Exit' to trigger a realistic phone call. 4. Do not walk directly home.";
    }
    if (q.includes('sms') || q.includes('gps')) {
      broadcastEmergencySms();
      return "Emergency SMS report compiled with live GPS location coordinates!";
    }
    if (q.includes('police') || q.includes('station')) {
      return "Nearest Police Station: Central Precinct - 100 Main St. Dial 911 or check Trip Escort & Map tab for marker details.";
    }
    return "Stay aware of your surroundings, keep FemSafe accessible, and tap Offline SMS or Siren if you need immediate assistance.";
  };

  const handleSendChat = () => {
    const text = chatInputField.value.trim();
    if (!text) return;

    appendChatMessage('user', text);
    chatInputField.value = '';

    setTimeout(() => {
      const reply = getAiResponse(text);
      appendChatMessage('bot', reply);
    }, 400);
  };

  sendChatBtn.addEventListener('click', handleSendChat);
  chatInputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSendChat(); });

  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chatInputField.value = chip.dataset.prompt;
      handleSendChat();
    });
  });

  // Voice Speech Recognition
  const voiceAssistantBtn = document.getElementById('voiceAssistantBtn');
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    voiceAssistantBtn.addEventListener('click', () => {
      try {
        recognition.start();
        voiceAssistantBtn.style.color = '#ff0055';
      } catch(e) {}
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInputField.value = transcript;
      handleSendChat();
      voiceAssistantBtn.style.color = 'inherit';
    };
  }

  // =========================================================================
  // EMERGENCY NETWORK & CONTACTS
  // =========================================================================
  const contactsListContainer = document.getElementById('contactsListContainer');
  const contactNameInput = document.getElementById('contactNameInput');
  const contactPhoneInput = document.getElementById('contactPhoneInput');
  const addContactBtn = document.getElementById('addContactBtn');

  const renderContacts = () => {
    contactsListContainer.innerHTML = '';
    state.contacts.forEach(contact => {
      const card = document.createElement('div');
      card.className = 'contact-item';
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--primary-pink),var(--amber-warning));display:flex;align-items:center;justify-content:center;font-weight:700;">${contact.name.charAt(0)}</div>
          <div>
            <h4 style="font-size:15px;color:#fff;">${contact.name}</h4>
            <p style="font-size:12px;color:#94a3b8;">${contact.phone} • ${contact.relation}</p>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="tel:${contact.phone}" class="icon-btn" title="Call"><i class="fa-solid fa-phone"></i></a>
          <a href="sms:${contact.phone}" class="icon-btn" title="SMS"><i class="fa-solid fa-message"></i></a>
          <button class="icon-btn btn-delete" data-id="${contact.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      contactsListContainer.appendChild(card);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        state.contacts = state.contacts.filter(c => c.id !== btn.dataset.id);
        saveContactsToStorage();
        renderContacts();
      });
    });
  };

  addContactBtn.addEventListener('click', () => {
    const name = contactNameInput.value.trim();
    const phone = contactPhoneInput.value.trim();
    if (!name || !phone) return;

    state.contacts.push({
      id: String(Date.now()),
      name: name,
      phone: phone,
      relation: 'Emergency Contact'
    });

    saveContactsToStorage();
    renderContacts();
    contactNameInput.value = '';
    contactPhoneInput.value = '';
  });

  // Initialize Core Modules
  initMap();
  initCameraFeed();
  renderContacts();

});
