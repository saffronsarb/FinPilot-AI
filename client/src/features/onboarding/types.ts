export interface OnboardingState {
  preferredName: string;
  avatar: string;
  country: string;
  birthday: string;
  college: string;
  shortBio: string;
  selectedCurrency: string;
  monthlyIncome: string;
  incomeMode: 'preset' | 'custom';
  primaryGoal: string;
  primaryGoalEmoji: string;
  customGoalName: string;
  targetAmount: string;
  targetMode: 'preset' | 'custom';
  preferredPayments: string[];
  aiPersonality: 'bestie' | 'professional' | 'coach' | 'calm';
}

export type OnboardingAction = Partial<OnboardingState>;

export interface StepProps {
  state: OnboardingState;
  updateState: (updates: OnboardingAction) => void;
  onNext?: () => void;
}
