import {
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Home,
  LogIn,
  Plus,
  Users,
  Copy,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

import {
  createMess,
  joinMess,
} from "../services/messService";
import { AuthContext } from "../context/AuthContext";

const MessSetup = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [createdMess, setCreatedMess] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [createForm, setCreateForm] = useState({
    messName: "",
    managerName: "",
    managerPhone: "",
    managerEmail: "",
  });

  const [joinForm, setJoinForm] = useState({
    messCode: "",
    memberName: "",
    memberPhone: "",
    memberEmail: "",
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setCreateForm((currentForm) => ({
      ...currentForm,
      managerName:
        currentForm.managerName ||
        user.name ||
        "",
      managerPhone:
        currentForm.managerPhone ||
        user.phone ||
        "",
      managerEmail:
        currentForm.managerEmail ||
        user.email ||
        "",
    }));

    setJoinForm((currentForm) => ({
      ...currentForm,
      memberName:
        currentForm.memberName ||
        user.name ||
        "",
      memberPhone:
        currentForm.memberPhone ||
        user.phone ||
        "",
      memberEmail:
        currentForm.memberEmail ||
        user.email ||
        "",
    }));
  }, [user]);

  const handleCreateChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleJoinChange = (event) => {
    const { name, value } = event.target;

    setJoinForm((previousData) => ({
      ...previousData,
      [name]:
        name === "messCode"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleCreateMess = async (event) => {
    event.preventDefault();

    if (!createForm.messName.trim()) {
      toast.error("Please enter a mess name.");
      return;
    }

    if (!createForm.managerName.trim()) {
      toast.error("Please enter the manager name.");
      return;
    }

    setLoading(true);

    try {
      const result = await createMess(createForm);

      if (!result.success) {
        toast.error(
          result.message || "Unable to create mess."
        );
        return;
      }

      setCreatedMess(result.mess);

      toast.success("Mess created successfully!");
    } catch (error) {
      console.error("Create mess error:", error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMess = async (event) => {
    event.preventDefault();

    if (!joinForm.messCode.trim()) {
      toast.error("Please enter the mess code.");
      return;
    }

    if (!joinForm.memberName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      const result = await joinMess(joinForm);

      if (!result.success) {
        toast.error(
          result.message || "Unable to join mess."
        );
        return;
      }

      toast.success(result.message);

      navigate("/dashboard");
    } catch (error) {
      console.error("Join mess error:", error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdMess?.code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdMess.code
      );

      setCodeCopied(true);
      toast.success("Mess code copied.");

      setTimeout(() => {
        setCodeCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Could not copy the code.");
    }
  };

  const handleContinueToDashboard = () => {
    navigate("/dashboard");
  };

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    setCreatedMess(null);
    setCodeCopied(false);
  };

  return (
    <div className="mess-setup-page">
      <div className="mess-setup-background-circle circle-one" />
      <div className="mess-setup-background-circle circle-two" />

      <button
        type="button"
        className="mess-setup-back-button"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={18} />
        Back to home
      </button>

      <main className="mess-setup-wrapper">
        <section className="mess-setup-intro">
          <div className="mess-setup-logo">
            <Home size={30} />
          </div>

          <p className="mess-setup-label">
            MESSMATE
          </p>

          <h1>Start managing your mess</h1>

          <p className="mess-setup-description">
            Create a new mess as a manager or join an
            existing mess using its unique code.
          </p>

          <div className="mess-setup-benefits">
            <div className="mess-setup-benefit">
              <CheckCircle2 size={20} />
              <span>Track daily meals</span>
            </div>

            <div className="mess-setup-benefit">
              <CheckCircle2 size={20} />
              <span>Organize every bazaar record</span>
            </div>

            <div className="mess-setup-benefit">
              <CheckCircle2 size={20} />
              <span>Generate monthly reports</span>
            </div>
          </div>
        </section>

        <section className="mess-setup-card">
          {!createdMess && (
            <>
              <div className="mess-setup-tabs">
                <button
                  type="button"
                  className={
                    activeTab === "create"
                      ? "mess-setup-tab active"
                      : "mess-setup-tab"
                  }
                  onClick={() => switchTab("create")}
                >
                  <Plus size={19} />
                  Create Mess
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "join"
                      ? "mess-setup-tab active"
                      : "mess-setup-tab"
                  }
                  onClick={() => switchTab("join")}
                >
                  <LogIn size={19} />
                  Join Mess
                </button>
              </div>

              {activeTab === "create" && (
                <div className="mess-setup-form-section">
                  <div className="mess-setup-form-heading">
                    <div className="mess-setup-form-icon">
                      <Home size={24} />
                    </div>

                    <div>
                      <h2>Create a new mess</h2>
                      <p>
                        You will become the manager and
                        first member.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateMess}>
                    <div className="mess-setup-field">
                      <label htmlFor="messName">
                        Mess name
                        <span>*</span>
                      </label>

                      <input
                        id="messName"
                        type="text"
                        name="messName"
                        placeholder="Example: Bachelor Paradise"
                        value={createForm.messName}
                        onChange={handleCreateChange}
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="mess-setup-field">
                      <label htmlFor="managerName">
                        Manager name
                        <span>*</span>
                      </label>

                      <input
                        id="managerName"
                        type="text"
                        name="managerName"
                        placeholder="Enter your full name"
                        value={createForm.managerName}
                        onChange={handleCreateChange}
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="mess-setup-grid">
                      <div className="mess-setup-field">
                        <label htmlFor="managerPhone">
                          Phone number
                        </label>

                        <input
                          id="managerPhone"
                          type="tel"
                          name="managerPhone"
                          placeholder="01XXXXXXXXX"
                          value={createForm.managerPhone}
                          onChange={handleCreateChange}
                          autoComplete="tel"
                        />
                      </div>

                      <div className="mess-setup-field">
                        <label htmlFor="managerEmail">
                          Email address
                        </label>

                        <input
                          id="managerEmail"
                          type="email"
                          name="managerEmail"
                          placeholder="name@example.com"
                          value={createForm.managerEmail}
                          onChange={handleCreateChange}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mess-setup-submit-button"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="mess-setup-loader" />
                      ) : (
                        <Plus size={20} />
                      )}

                      {loading
                        ? "Creating Mess..."
                        : "Create Mess"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "join" && (
                <div className="mess-setup-form-section">
                  <div className="mess-setup-form-heading">
                    <div className="mess-setup-form-icon">
                      <Users size={24} />
                    </div>

                    <div>
                      <h2>Join an existing mess</h2>
                      <p>
                        Ask your manager for the unique mess
                        code.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleJoinMess}>
                    <div className="mess-setup-field">
                      <label htmlFor="messCode">
                        Mess code
                        <span>*</span>
                      </label>

                      <input
                        id="messCode"
                        type="text"
                        name="messCode"
                        className="mess-code-input"
                        placeholder="Example: BP-4X8K2M"
                        value={joinForm.messCode}
                        onChange={handleJoinChange}
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="mess-setup-field">
                      <label htmlFor="memberName">
                        Member name
                        <span>*</span>
                      </label>

                      <input
                        id="memberName"
                        type="text"
                        name="memberName"
                        placeholder="Enter your full name"
                        value={joinForm.memberName}
                        onChange={handleJoinChange}
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="mess-setup-grid">
                      <div className="mess-setup-field">
                        <label htmlFor="memberPhone">
                          Phone number
                        </label>

                        <input
                          id="memberPhone"
                          type="tel"
                          name="memberPhone"
                          placeholder="01XXXXXXXXX"
                          value={joinForm.memberPhone}
                          onChange={handleJoinChange}
                          autoComplete="tel"
                        />
                      </div>

                      <div className="mess-setup-field">
                        <label htmlFor="memberEmail">
                          Email address
                        </label>

                        <input
                          id="memberEmail"
                          type="email"
                          name="memberEmail"
                          placeholder="name@example.com"
                          value={joinForm.memberEmail}
                          onChange={handleJoinChange}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mess-setup-submit-button"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="mess-setup-loader" />
                      ) : (
                        <LogIn size={20} />
                      )}

                      {loading
                        ? "Joining Mess..."
                        : "Join Mess"}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {createdMess && (
            <div className="mess-created-success">
              <div className="mess-created-success-icon">
                <CheckCircle2 size={44} />
              </div>

              <p className="mess-created-small-title">
                MESS CREATED SUCCESSFULLY
              </p>

              <h2>{createdMess.name}</h2>

              <p className="mess-created-description">
                Share this code with your mess members so
                they can join your mess.
              </p>

              <div className="mess-created-code-box">
                <span>Your mess code</span>

                <strong>{createdMess.code}</strong>

                <button
                  type="button"
                  onClick={handleCopyCode}
                >
                  {codeCopied ? (
                    <CheckCircle2 size={19} />
                  ) : (
                    <Copy size={19} />
                  )}

                  {codeCopied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="mess-created-warning">
                Save this code carefully. Members will need
                it to join this mess.
              </div>

              <button
                type="button"
                className="mess-setup-submit-button"
                onClick={handleContinueToDashboard}
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </section>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .mess-setup-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 90px 24px 50px;
          font-family: "Poppins", sans-serif;
          background:
            linear-gradient(
              135deg,
              #eff6ff 0%,
              #f8fafc 45%,
              #eef2ff 100%
            );
        }

        .mess-setup-background-circle {
          position: absolute;
          border-radius: 999px;
          filter: blur(3px);
          pointer-events: none;
        }

        .circle-one {
          width: 360px;
          height: 360px;
          top: -140px;
          left: -110px;
          background: rgba(37, 99, 235, 0.12);
        }

        .circle-two {
          width: 440px;
          height: 440px;
          right: -170px;
          bottom: -180px;
          background: rgba(79, 70, 229, 0.1);
        }

        .mess-setup-back-button {
          position: absolute;
          z-index: 5;
          top: 28px;
          left: 32px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          padding: 10px 14px;
          border-radius: 10px;
          color: #334155;
          background: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: 0.2s ease;
        }

        .mess-setup-back-button:hover {
          color: #2563eb;
          background: #ffffff;
          transform: translateX(-2px);
        }

        .mess-setup-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 0.85fr 1.15fr;
          align-items: center;
          gap: 70px;
        }

        .mess-setup-intro {
          padding: 20px 0;
        }

        .mess-setup-logo {
          width: 68px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          border-radius: 20px;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          box-shadow:
            0 15px 35px rgba(37, 99, 235, 0.28);
        }

        .mess-setup-label {
          margin: 0 0 10px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .mess-setup-intro h1 {
          max-width: 480px;
          margin: 0;
          color: #0f172a;
          font-size: clamp(36px, 5vw, 58px);
          line-height: 1.1;
          letter-spacing: -2px;
        }

        .mess-setup-description {
          max-width: 500px;
          margin: 22px 0 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.8;
        }

        .mess-setup-benefits {
          display: grid;
          gap: 14px;
          margin-top: 30px;
        }

        .mess-setup-benefit {
          display: flex;
          align-items: center;
          gap: 11px;
          color: #334155;
          font-size: 15px;
          font-weight: 500;
        }

        .mess-setup-benefit svg {
          color: #16a34a;
        }

        .mess-setup-card {
          width: 100%;
          min-height: 595px;
          padding: 28px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow:
            0 30px 80px rgba(15, 23, 42, 0.13);
          backdrop-filter: blur(18px);
        }

        .mess-setup-tabs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 6px;
          margin-bottom: 30px;
          border-radius: 15px;
          background: #f1f5f9;
        }

        .mess-setup-tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 13px 12px;
          border: 0;
          border-radius: 11px;
          color: #64748b;
          background: transparent;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .mess-setup-tab.active {
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          box-shadow:
            0 8px 18px rgba(37, 99, 235, 0.25);
        }

        .mess-setup-form-heading {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 27px;
        }

        .mess-setup-form-icon {
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          color: #2563eb;
          background: #dbeafe;
        }

        .mess-setup-form-heading h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 23px;
        }

        .mess-setup-form-heading p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .mess-setup-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .mess-setup-field {
          margin-bottom: 18px;
        }

        .mess-setup-field label {
          display: block;
          margin-bottom: 8px;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .mess-setup-field label span {
          margin-left: 3px;
          color: #ef4444;
        }

        .mess-setup-field input {
          width: 100%;
          height: 50px;
          padding: 0 15px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          outline: none;
          color: #0f172a;
          background: #ffffff;
          font-family: inherit;
          font-size: 14px;
          transition: 0.2s ease;
        }

        .mess-setup-field input::placeholder {
          color: #94a3b8;
        }

        .mess-setup-field input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .mess-code-input {
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .mess-setup-submit-button {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 7px;
          padding: 13px 18px;
          border: 0;
          border-radius: 13px;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 12px 24px rgba(37, 99, 235, 0.25);
          transition: 0.25s ease;
        }

        .mess-setup-submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 16px 28px rgba(37, 99, 235, 0.32);
        }

        .mess-setup-submit-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .mess-setup-loader {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: messSetupSpin 0.7s linear infinite;
        }

        @keyframes messSetupSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .mess-created-success {
          min-height: 535px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
        }

        .mess-created-success-icon {
          width: 82px;
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          border-radius: 50%;
          color: #16a34a;
          background: #dcfce7;
        }

        .mess-created-small-title {
          margin: 0 0 7px;
          color: #16a34a;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .mess-created-success h2 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
        }

        .mess-created-description {
          max-width: 410px;
          margin: 12px 0 25px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
        }

        .mess-created-code-box {
          width: 100%;
          padding: 21px;
          border: 1px dashed #93c5fd;
          border-radius: 16px;
          background: #eff6ff;
        }

        .mess-created-code-box span {
          display: block;
          margin-bottom: 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .mess-created-code-box strong {
          display: block;
          margin-bottom: 15px;
          color: #1d4ed8;
          font-size: clamp(25px, 5vw, 35px);
          letter-spacing: 3px;
          word-break: break-word;
        }

        .mess-created-code-box button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 15px;
          border: 0;
          border-radius: 9px;
          color: #ffffff;
          background: #2563eb;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .mess-created-warning {
          width: 100%;
          margin: 17px 0 10px;
          padding: 12px 15px;
          border-radius: 11px;
          color: #92400e;
          background: #fffbeb;
          font-size: 13px;
        }

        body.dark .mess-setup-page {
          background:
            linear-gradient(
              135deg,
              #0f172a 0%,
              #111827 50%,
              #172554 100%
            );
        }

        body.dark .mess-setup-intro h1,
        body.dark .mess-setup-form-heading h2,
        body.dark .mess-created-success h2 {
          color: #f8fafc;
        }

        body.dark .mess-setup-description,
        body.dark .mess-setup-form-heading p {
          color: #94a3b8;
        }

        body.dark .mess-setup-benefit {
          color: #cbd5e1;
        }

        body.dark .mess-setup-card {
          border-color: #334155;
          background: rgba(30, 41, 59, 0.93);
        }

        body.dark .mess-setup-tabs {
          background: #0f172a;
        }

        body.dark .mess-setup-field label {
          color: #cbd5e1;
        }

        body.dark .mess-setup-field input {
          border-color: #475569;
          color: #f8fafc;
          background: #0f172a;
        }

        body.dark .mess-created-code-box {
          border-color: #3b82f6;
          background: #172554;
        }

        body.dark .mess-setup-back-button {
          color: #cbd5e1;
          background: rgba(30, 41, 59, 0.85);
        }

        @media (max-width: 900px) {
          .mess-setup-page {
            padding-top: 100px;
          }

          .mess-setup-wrapper {
            max-width: 650px;
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .mess-setup-intro {
            text-align: center;
          }

          .mess-setup-logo {
            margin-right: auto;
            margin-left: auto;
          }

          .mess-setup-intro h1,
          .mess-setup-description {
            margin-right: auto;
            margin-left: auto;
          }

          .mess-setup-benefits {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        @media (max-width: 600px) {
          .mess-setup-page {
            padding: 85px 14px 30px;
          }

          .mess-setup-back-button {
            top: 20px;
            left: 16px;
          }

          .mess-setup-intro h1 {
            font-size: 36px;
            letter-spacing: -1px;
          }

          .mess-setup-card {
            min-height: auto;
            padding: 18px;
            border-radius: 20px;
          }

          .mess-setup-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .mess-setup-tab {
            padding: 12px 7px;
            font-size: 12px;
          }

          .mess-setup-form-heading {
            align-items: flex-start;
          }

          .mess-created-success {
            min-height: 490px;
            padding: 10px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default MessSetup;
