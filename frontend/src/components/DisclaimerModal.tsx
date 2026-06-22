import React, { useState } from "react";
import "../styles/disclaimer.css";

interface DisclaimerModalProps {
  onAccept: () => void;
  isOpen: boolean;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  onAccept,
  isOpen,
}) => {
  const [checks, setChecks] = useState({
    audio: false,
    data: false,
    services: false,
    accuracy: false,
  });

  const allChecked = Object.values(checks).every((val) => val);

  const handleCheck = (key: keyof typeof checks) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAccept = () => {
    if (allChecked) {
      localStorage.setItem("disclaimerAccepted", "true");
      onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal">
        {/* Title Bar */}
        <div className="disclaimer-modal-header">
          <div className="winbar-dots">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </div>
          <div className="disclaimer-modal-label">terms.exe</div>
        </div>

        {/* Content */}
        <div className="disclaimer-body">
          <h1>⚠️ Terms & Disclaimer</h1>
          <p className="disclaimer-intro">
            Please review and accept these important terms before using the app.
          </p>

          <div className="disclaimer-sections">
            {/* Audio Recording */}
            <div className="disclaimer-section">
              <div className="disclaimer-checkbox">
                <input
                  type="checkbox"
                  id="audio-check"
                  checked={checks.audio}
                  onChange={() => handleCheck("audio")}
                />
                <label htmlFor="audio-check">
                  <strong>🎤 Audio Recording & Processing</strong>
                </label>
              </div>
              <p className="disclaimer-content">
                This app records your voice for pronunciation analysis. Your
                audio is processed by Google Cloud services (Text-to-Speech and
                Speech Recognition) to evaluate your Turkish pronunciation. By
                using this app, you consent to voice recording and processing.
              </p>
            </div>

            {/* Data Collection */}
            <div className="disclaimer-section">
              <div className="disclaimer-checkbox">
                <input
                  type="checkbox"
                  id="data-check"
                  checked={checks.data}
                  onChange={() => handleCheck("data")}
                />
                <label htmlFor="data-check">
                  <strong>📊 Data Collection & Storage</strong>
                </label>
              </div>
              <p className="disclaimer-content">
                Your learning progress, responses, pronunciation attempts,
                scores, and account information are stored on our servers. We
                retain this data to track your progress and improve the learning
                experience. You can request data deletion at any time.
              </p>
            </div>

            {/* Third-party Services */}
            <div className="disclaimer-section">
              <div className="disclaimer-checkbox">
                <input
                  type="checkbox"
                  id="services-check"
                  checked={checks.services}
                  onChange={() => handleCheck("services")}
                />
                <label htmlFor="services-check">
                  <strong>🔧 Third-party Services</strong>
                </label>
              </div>
              <p className="disclaimer-content">
                This app uses Google Cloud services for speech processing. Your
                data is subject to Google's privacy policies. We also use
                industry-standard hosting and analytics services. Please review
                third-party terms of service.
              </p>
            </div>

            {/* Accuracy & Learning Disclaimer */}
            <div className="disclaimer-section">
              <div className="disclaimer-checkbox">
                <input
                  type="checkbox"
                  id="accuracy-check"
                  checked={checks.accuracy}
                  onChange={() => handleCheck("accuracy")}
                />
                <label htmlFor="accuracy-check">
                  <strong>📚 Accuracy & Learning Use</strong>
                </label>
              </div>
              <p className="disclaimer-content">
                Pronunciation scores are automated estimates and may not reflect
                actual native speaker accuracy. This app is a supplementary
                learning tool—consider combining it with professional Turkish
                instruction. Scores should not be considered a certified
                assessment of proficiency.
              </p>
            </div>

            {/* Security Note */}
            <div className="disclaimer-section disclaimer-security">
              <p className="disclaimer-content">
                <strong>⚠️ Security Note:</strong> Access your account only from
                trusted devices. Your authentication token is stored locally in
                your browser. Use strong passwords and log out from public
                computers.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="disclaimer-footer-section">
          <div className="disclaimer-actions">
            <button
              className={`btn-accept ${allChecked ? "active" : "disabled"}`}
              onClick={handleAccept}
              disabled={!allChecked}
            >
              {allChecked ? "I Agree & Continue" : "Check all to continue"}
            </button>
          </div>
          <p className="disclaimer-footer-text">
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};
