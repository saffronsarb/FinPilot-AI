import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { getUser, setAuth } from '../../lib/auth';
import { onboardingEngine } from '../../lib/onboardingEngine';
import { preferencesEngine } from '../../lib/preferencesEngine';
import { profileEngine } from '../../lib/profileEngine';
import { savingsEngine } from '../../lib/savingsEngine';

import { OnboardingState } from './types';
import {
  WelcomeStep,
  NameAvatarStep,
  CountryStep,
  BirthdayStep,
  CollegeStep,
  ShortBioStep,
  CurrencyStep,
  AllowanceStep,
  PrimaryGoalStep,
  TargetAmountStep,
  PaymentMethodsStep,
  AIPersonalityStep,
  SummaryStep
} from './steps';

export default function Onboarding() {
  const [user, setUser] = useState<any>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, setState] = useState<OnboardingState>({
    preferredName: '',
    avatar: '🦊',
    country: '',
    birthday: '',
    college: '',
    shortBio: '',
    selectedCurrency: '₹',
    monthlyIncome: '5000',
    incomeMode: 'preset',
    primaryGoal: '',
    primaryGoalEmoji: '🎯',
    customGoalName: '',
    targetAmount: '10000',
    targetMode: 'preset',
    preferredPayments: [],
    aiPersonality: 'bestie',
  });

  const updateState = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      toast.error('Please sign in first, bestie! 🫠');
      navigate('/login');
      return;
    }
    setUser(currentUser);
    updateState({ preferredName: currentUser.name || '' });

    const savedStep = onboardingEngine.getResumeStep(currentUser.id);
    if (savedStep > 0 && savedStep < 12) {
      setStep(savedStep);
    }
  }, [navigate]);

  useEffect(() => {
    if (user && step > 0 && step < 12) {
      onboardingEngine.saveResumeStep(user.id, step);
    }
  }, [step, user]);

  const handleNext = () => {
    if (step === 1 && !state.preferredName.trim()) {
      toast.error('Please tell us your preferred name!');
      return;
    }
    if (step === 2 && !state.country.trim()) {
      toast.error('Please enter your country!');
      return;
    }
    if (step === 3 && !state.birthday.trim()) {
      toast.error('Please select your date of birth!');
      return;
    }
    if (step === 4 && !state.college.trim()) {
      toast.error('Please enter your college, university, or school!');
      return;
    }
    if (step === 6 && !state.selectedCurrency) {
      toast.error('Please pick a currency!');
      return;
    }
    if (step === 7 && (state.monthlyIncome === '' || Number(state.monthlyIncome) <= 0)) {
      toast.error('Please enter a valid monthly allowance!');
      return;
    }
    if (step === 8 && !state.primaryGoal && !state.customGoalName.trim()) {
      toast.error('Please select or specify what you are saving for!');
      return;
    }
    if (step === 9) {
      const amt = Number(state.targetAmount);
      if (state.targetAmount === '' || isNaN(amt) || amt <= 0) {
        toast.error('Please enter a valid target amount greater than zero!');
        return;
      }
      if (amt > 1000000000) {
        toast.error('Please set a realistic target amount!');
        return;
      }
    }
    if (step === 10 && state.preferredPayments.length === 0) {
      toast.error('Please select at least one preferred payment method!');
      return;
    }

    if (step < 12) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updatedUser = {
        ...user,
        name: state.preferredName,
        monthlyAllowance: Number(state.monthlyIncome),
        currency: state.selectedCurrency,
      };
      setAuth(localStorage.getItem('breadbuddy_token') || '', updatedUser);

      profileEngine.setAvatar(user.id, state.avatar);
      profileEngine.saveProfileFields(user.id, {
        primaryGoal: state.primaryGoal === 'custom' ? state.customGoalName : state.primaryGoal,
        preferredPaymentMethods: state.preferredPayments,
        currencyPreferred: state.selectedCurrency,
        birthday: state.birthday,
        college: state.college,
        country: state.country,
        shortBio: state.shortBio,
      });
      preferencesEngine.savePreferences(user.id, {
        aiBroPersonality: state.aiPersonality,
      });

      const finalGoalName = state.primaryGoal === 'custom' ? state.customGoalName : state.primaryGoal;
      const finalGoalEmoji = state.primaryGoal === 'custom' ? '✨' : state.primaryGoalEmoji;
      savingsEngine.createGoal(user.id, finalGoalName, finalGoalEmoji, Number(state.targetAmount), null, true);

      onboardingEngine.setCompleted(user.id, true);

      window.location.replace('/dashboard');
    } catch (err) {
      toast.error('Error setting up your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const renderStep = () => {
    const props = { state, updateState, onNext: handleNext };
    switch (step) {
      case 0: return <WelcomeStep key="0" {...props} />;
      case 1: return <NameAvatarStep key="1" {...props} />;
      case 2: return <CountryStep key="2" {...props} />;
      case 3: return <BirthdayStep key="3" {...props} />;
      case 4: return <CollegeStep key="4" {...props} />;
      case 5: return <ShortBioStep key="5" {...props} />;
      case 6: return <CurrencyStep key="6" {...props} />;
      case 7: return <AllowanceStep key="7" {...props} />;
      case 8: return <PrimaryGoalStep key="8" {...props} />;
      case 9: return <TargetAmountStep key="9" {...props} />;
      case 10: return <PaymentMethodsStep key="10" {...props} />;
      case 11: return <AIPersonalityStep key="11" {...props} />;
      case 12: return <SummaryStep key="12" {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center py-10 px-4 select-none">
      <Card accent="violet" className="w-full max-w-xl p-8 flex flex-col justify-between min-h-[540px]">
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-bb-xs transition-all duration-300 ${
                i <= step ? 'bg-bb-violet flex-1' : 'bg-bb-border w-2'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center py-4">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center mt-8 border-t-2 border-bb-border pt-5">
          {step > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 !text-bb-coral !border-bb-coral !shadow-bb-coral hover:!bg-bb-coral hover:!text-bb-coral-fg hover:!border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-coral"
            >
              <ArrowLeft size={14} /> Back
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleNext}
            loading={step === 12 ? isSubmitting : false}
            className="flex items-center gap-1.5 ml-auto"
          >
            {step === 0 ? (
              <>Lock In <Lock size={12} /></>
            ) : step === 12 ? (
              'Enter FinPilot AI →'
            ) : (
              <>Continue <ArrowRight size={14} /></>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
