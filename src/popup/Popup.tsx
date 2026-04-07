import React from 'react';
import './popup.css';

const Popup: React.FC = () => {
  return (
    <div className="popup-shell">
      <div className="badge">Sketch Party</div>
      <h1>Setup in progress</h1>
      <p className="muted">
        Base project is scaffolded. Core auth, payment, and analytics wiring will
        land next.
      </p>
    </div>
  );
};

export default Popup;
