import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Mail,
  CheckCircle2, 
  RotateCw, 
  X, 
  ArrowRight, 
  Sparkles,
  AlertCircle,
  Lock,
  Check
} from 'lucide-react';

export default function OtpVerificationModal({
  isOpen,
  onClose,
  phoneNumber,
  email,
  accountName,
  accountType = 'customer', // 'customer' | 'seller'
  onVerifySuccess
}) {
  const hasEmail = Boolean(email && email.trim());
  const [activeChannel, setActiveChannel] = useState('mobile'); // 'mobile' | 'email'

  // Mobile OTP State
  const [mobileOtpValues, setMobileOtpValues] = useState(['', '', '', '', '', '']);
  const [expectedMobileOtp, setExpectedMobileOtp] = useState('');
  const [mobileVerified, setMobileVerified] = useState(false);

  // Email OTP State
  const [emailOtpValues, setEmailOtpValues] = useState(['', '', '', '', '', '']);
  const [expectedEmailOtp, setExpectedEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  
  const inputRefs = useRef([]);

  // Generate random 6-digit OTPs
  const generateNewOtps = () => {
    const mCode = String(Math.floor(100000 + Math.random() * 900000));
    const eCode = String(Math.floor(100000 + Math.random() * 900000));
    setExpectedMobileOtp(mCode);
    setExpectedEmailOtp(eCode);
    setMobileOtpValues(['', '', '', '', '', '']);
    setEmailOtpValues(['', '', '', '', '', '']);
    setMobileVerified(false);
    setEmailVerified(false);
    setErrorMsg('');
    setResendSeconds(30);
    setIsSuccess(false);
    return { mCode, eCode };
  };

  useEffect(() => {
    if (isOpen) {
      generateNewOtps();
      setActiveChannel('mobile');
      setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 150);
    }
  }, [isOpen, phoneNumber, email]);

  // Resend countdown timer
  useEffect(() => {
    if (!isOpen || resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendSeconds]);

  if (!isOpen) return null;

  const currentOtpValues = activeChannel === 'mobile' ? mobileOtpValues : emailOtpValues;
  const currentSetter = activeChannel === 'mobile' ? setMobileOtpValues : setEmailOtpValues;
  const expectedCurrentOtp = activeChannel === 'mobile' ? expectedMobileOtp : expectedEmailOtp;

  const handleDigitChange = (index, value) => {
    setErrorMsg('');
    const cleanVal = value.replace(/\D/g, '');

    // Handle paste of 6 digits
    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      const updated = [...currentOtpValues];
      chars.forEach((c, i) => {
        if (index + i < 6) updated[index + i] = c;
      });
      currentSetter(updated);
      const nextIdx = Math.min(index + chars.length, 5);
      if (inputRefs.current[nextIdx]) inputRefs.current[nextIdx].focus();
      return;
    }

    const updated = [...currentOtpValues];
    updated[index] = cleanVal ? cleanVal[0] : '';
    currentSetter(updated);

    if (cleanVal && index < 5) {
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !currentOtpValues[index] && index > 0) {
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handleAutoFillCurrent = () => {
    if (!expectedCurrentOtp) return;
    currentSetter(expectedCurrentOtp.split(''));
    setErrorMsg('');
    if (inputRefs.current[5]) inputRefs.current[5].focus();
  };

  // 1-Click Verify Both for convenience in Hackathon demo
  const handleAutoFillAndVerifyBoth = () => {
    setMobileOtpValues(expectedMobileOtp.split(''));
    setEmailOtpValues(expectedEmailOtp.split(''));
    setMobileVerified(true);
    if (hasEmail) setEmailVerified(true);
    setIsVerifying(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
      setTimeout(() => {
        if (onVerifySuccess) onVerifySuccess();
      }, 900);
    }, 600);
  };

  const handleVerifyActiveChannel = (e) => {
    if (e) e.preventDefault();
    const entered = currentOtpValues.join('');
    if (entered.length < 6) {
      setErrorMsg(`Please enter the complete 6-digit ${activeChannel === 'mobile' ? 'Mobile' : 'Email'} OTP.`);
      return;
    }

    if (entered !== expectedCurrentOtp) {
      setErrorMsg(`Invalid ${activeChannel === 'mobile' ? 'Mobile' : 'Email'} code. Check notification or click Resend.`);
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsVerifying(false);

      if (activeChannel === 'mobile') {
        setMobileVerified(true);
        if (hasEmail && !emailVerified) {
          // Advance to Email verification
          setActiveChannel('email');
          setTimeout(() => {
            if (inputRefs.current[0]) inputRefs.current[0].focus();
          }, 150);
          return;
        }
      } else {
        setEmailVerified(true);
      }

      // If both (or only mobile if no email) are verified, finalize
      const isMobileDone = activeChannel === 'mobile' ? true : mobileVerified;
      const isEmailDone = !hasEmail || (activeChannel === 'email' ? true : emailVerified);

      if (isMobileDone && isEmailDone) {
        setIsSuccess(true);
        setTimeout(() => {
          if (onVerifySuccess) onVerifySuccess();
        }, 900);
      }
    }, 500);
  };

  const formattedPhone = phoneNumber
    ? (phoneNumber.startsWith('+') ? phoneNumber : `+91 ${phoneNumber}`)
    : '+91 98XXX XXXXX';

  const bothVerified = mobileVerified && (!hasEmail || emailVerified);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/65 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif] animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-zinc-200/90 shadow-2xl p-6 sm:p-7 space-y-5 overflow-hidden">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isVerifying || isSuccess}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dual Live Notification Previews (SMS & Email) */}
        {!isSuccess && (
          <div className="space-y-2">
            {/* Mobile SMS Notification Card */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              activeChannel === 'mobile'
                ? 'bg-zinc-900 border-zinc-800 text-white shadow-md'
                : 'bg-zinc-50 border-zinc-200 text-zinc-700 opacity-80'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeChannel === 'mobile' ? 'bg-zinc-800 text-emerald-400' : 'bg-zinc-200 text-zinc-700'}`}>
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[11px]">
                    SMS • FYND-SEC ({formattedPhone})
                  </span>
                </div>
                {mobileVerified ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="font-mono text-xs font-bold text-emerald-400 px-1.5 py-0.5 bg-zinc-800 rounded">
                    OTP: {expectedMobileOtp}
                  </span>
                )}
              </div>
            </div>

            {/* Email Notification Card (when email is provided) */}
            {hasEmail && (
              <div className={`p-2.5 rounded-2xl border transition-all ${
                activeChannel === 'email'
                  ? 'bg-zinc-900 border-zinc-800 text-white shadow-md'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 opacity-80'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${activeChannel === 'email' ? 'bg-zinc-800 text-indigo-400' : 'bg-zinc-200 text-zinc-700'}`}>
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[11px] truncate max-w-[200px]">
                      Email • {email}
                    </span>
                  </div>
                  {emailVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-bold text-indigo-300 px-1.5 py-0.5 bg-zinc-800 rounded">
                      OTP: {expectedEmailOtp}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Header Icon & Title */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            {isSuccess ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
            )}
          </div>
          <h3 className="text-xl font-extrabold text-zinc-950 tracking-tight">
            {isSuccess ? 'Verification Complete!' : (hasEmail ? 'Dual-Channel OTP Verification' : 'Verify Mobile Number')}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {isSuccess ? (
              <span className="text-emerald-600 font-semibold">
                Both Mobile and Email identity verified. Setting up your profile...
              </span>
            ) : hasEmail ? (
              <>Verify both your <strong className="text-zinc-800">Mobile SMS OTP</strong> and <strong className="text-zinc-800">Email OTP</strong> to activate your {accountType === 'seller' ? 'merchant store' : 'customer profile'}.</>
            ) : (
              <>Enter the 6-digit verification code sent to <strong className="text-zinc-900 font-mono">{formattedPhone}</strong>.</>
            )}
          </p>
        </div>

        {/* Dual Channel Navigation Tabs (When Email is Present) */}
        {!isSuccess && hasEmail && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setActiveChannel('mobile');
                setErrorMsg('');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                activeChannel === 'mobile'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>1. Mobile OTP</span>
              {mobileVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveChannel('email');
                setErrorMsg('');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                activeChannel === 'email'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>2. Email OTP</span>
              {emailVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
            </button>
          </div>
        )}

        {/* OTP Input Form for Currently Active Channel */}
        {!isSuccess && (
          <form onSubmit={handleVerifyActiveChannel} className="space-y-4 pt-1">
            <div className="text-center">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Enter {activeChannel === 'mobile' ? 'Mobile Phone' : 'Email'} 6-Digit Code:
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {currentOtpValues.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isVerifying}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-lg font-black rounded-2xl border transition-all duration-150 outline-none ${
                    digit 
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' 
                      : 'bg-zinc-50 text-zinc-900 border-zinc-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Actions & Submission */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleAutoFillCurrent}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Auto-fill {activeChannel === 'mobile' ? 'Mobile' : 'Email'} Code</span>
                </button>

                {hasEmail && (
                  <button
                    type="button"
                    onClick={handleAutoFillAndVerifyBoth}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition"
                    title="1-Click Sandbox: Automatically verify both SMS and Email"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>⚡ 1-Click Verify Both</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifying || currentOtpValues.join('').length < 6}
                className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {hasEmail && activeChannel === 'mobile' && !mobileVerified
                        ? 'Verify Mobile & Continue to Email'
                        : 'Verify & Complete Registration'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-500 px-1 pt-1">
                <span>Didn't receive code?</span>
                {resendSeconds > 0 ? (
                  <span className="font-mono text-zinc-400 font-medium">
                    Resend in <strong className="text-zinc-700">{resendSeconds}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={generateNewOtps}
                    className="font-bold text-indigo-600 hover:text-indigo-800 underline transition cursor-pointer"
                  >
                    Resend New Codes
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Success State Visual */}
        {isSuccess && (
          <div className="py-6 text-center space-y-3 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>{hasEmail ? 'Mobile & Email Authenticated' : 'Mobile Number Verified'}</span>
            </div>
            <p className="text-xs text-zinc-500">
              Welcome to the platform! Redirecting to your verified dashboard...
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
