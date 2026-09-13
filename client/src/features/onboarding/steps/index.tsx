import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { BrandMark } from '../../../components/ui/BrandMark';
import { formatCurrency } from '../../../utils/currencyUtils';
import { StepProps } from '../types';
import {
  AVATARS,
  CURRENCIES,
  CURRENCY_INCOME_PRESETS,
  CURRENCY_TARGET_PRESETS,
  GOALS_PRESETS,
  PAYMENT_METHODS,
  PERSONALITIES,
} from '../constants';

const stepMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
};

export const WelcomeStep: React.FC<StepProps> = () => (
  <motion.div {...stepMotion} className="space-y-4 text-center">
    <BrandMark size="lg" className="animate-float" />
    <h1 className="text-2xl font-black text-bb-text-primary leading-tight">Welcome to FinPilot AI</h1>
    <p className="text-xs text-bb-text-muted font-mono uppercase tracking-widest select-none">
      Chenab Intelligence
    </p>
  </motion.div>
);

export const NameAvatarStep: React.FC<StepProps> = ({ state, updateState }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <h2 className="text-lg font-black text-bb-text-primary">What should we call you?</h2>
      <p className="text-xs text-bb-text-muted">Pick a preferred name and avatar for your profile.</p>
    </div>
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Enter preferred name"
        value={state.preferredName}
        onChange={(e) => updateState({ preferredName: e.target.value })}
        required
      />
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-bb-text-muted font-mono">
          Avatar Preview: <span className="text-lg ml-1">{state.avatar}</span>
        </label>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => updateState({ avatar: av })}
              className={`text-2xl p-2 rounded-bb-xs border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                state.avatar === av
                  ? 'border-bb-violet bg-bb-violet text-bb-violet-fg scale-105'
                  : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
              }`}
            >
              {av}
            </button>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

export const CountryStep: React.FC<StepProps> = ({ state, updateState }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <h2 className="text-lg font-black text-bb-text-primary">Where are you based?</h2>
      <p className="text-xs text-bb-text-muted">Select your home region for local money vibes.</p>
    </div>
    <Input
      type="text"
      label="Country"
      value={state.country}
      onChange={(e) => updateState({ country: e.target.value })}
      required
    />
  </motion.div>
);

export const BirthdayStep: React.FC<StepProps> = ({ state, updateState }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <h2 className="text-lg font-black text-bb-text-primary">When's your birthday?</h2>
      <p className="text-xs text-bb-text-muted">Lock in your date so we can celebrate you.</p>
    </div>
    <Input
      type="date"
      label="Date of Birth"
      value={state.birthday}
      onChange={(e) => updateState({ birthday: e.target.value })}
      required
    />
  </motion.div>
);

export const CollegeStep: React.FC<StepProps> = ({ state, updateState }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <h2 className="text-lg font-black text-bb-text-primary">Where do you study?</h2>
      <p className="text-xs text-bb-text-muted">Tell us your campus for student-tailored goals.</p>
    </div>
    <Input
      type="text"
      label="College / University / School"
      value={state.college}
      onChange={(e) => updateState({ college: e.target.value })}
      required
    />
  </motion.div>
);

export const ShortBioStep: React.FC<StepProps> = ({ state, updateState, onNext }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-bb-text-primary">Write a short bio</h2>
        <span className="text-[10px] font-mono font-bold text-bb-violet uppercase tracking-wider bg-bb-violet/10 px-2 py-0.5 rounded-bb-xs border border-bb-violet/30">
          Optional
        </span>
      </div>
      <p className="text-xs text-bb-text-muted">Share a quick motto about your main vibe.</p>
    </div>
    <Input
      type="text"
      label="Short Bio"
      value={state.shortBio}
      onChange={(e) => updateState({ shortBio: e.target.value })}
    />
    <div className="flex justify-end pt-1">
      <button
        type="button"
        onClick={onNext}
        className="text-xs font-bold text-bb-text-muted hover:text-bb-violet underline transition-colors cursor-pointer"
      >
        Skip bio for now →
      </button>
    </div>
  </motion.div>
);

export const CurrencyStep: React.FC<StepProps> = ({ state, updateState }) => {
  const handleCurrencySelect = (sym: string) => {
    const incPresets = CURRENCY_INCOME_PRESETS[sym] || CURRENCY_INCOME_PRESETS['₹'];
    const tgtPresets = CURRENCY_TARGET_PRESETS[sym] || CURRENCY_TARGET_PRESETS['₹'];
    updateState({
      selectedCurrency: sym,
      monthlyIncome: incPresets[1].value.toString(),
      targetAmount: tgtPresets[1].toString(),
      incomeMode: 'preset',
      targetMode: 'preset',
    });
  };

  return (
    <motion.div {...stepMotion} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-bb-text-primary">What's your currency?</h2>
        <p className="text-xs text-bb-text-muted">Select the currency you daily use.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => handleCurrencySelect(c.symbol)}
            className={`p-4 rounded-bb-sm border-2 text-left flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
              state.selectedCurrency === c.symbol
                ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
            }`}
          >
            <span className="text-2xl">{c.flag}</span>
            <div>
              <div className="text-sm font-black font-mono">{c.symbol} {c.code}</div>
              <div className={`text-[10px] font-semibold mt-0.5 ${
                state.selectedCurrency === c.symbol ? 'text-bb-violet-fg/70' : 'text-bb-text-muted'
              }`}>{c.name}</div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export const AllowanceStep: React.FC<StepProps> = ({ state, updateState }) => {
  const customInputRef = useRef<HTMLInputElement>(null);
  const incomePresets = CURRENCY_INCOME_PRESETS[state.selectedCurrency] || CURRENCY_INCOME_PRESETS['₹'];

  useEffect(() => {
    if (state.incomeMode === 'custom' && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [state.incomeMode]);

  return (
    <motion.div {...stepMotion} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-bb-text-primary">What's your monthly allowance?</h2>
        <p className="text-xs text-bb-text-muted">Pick your monthly cash bracket. We won't tell your parents.</p>
      </div>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {incomePresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => updateState({ monthlyIncome: preset.value.toString(), incomeMode: 'preset' })}
              className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                state.incomeMode === 'preset' && state.monthlyIncome === preset.value.toString()
                  ? 'bg-bb-violet text-bb-violet-fg border-black'
                  : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateState({ incomeMode: 'custom' })}
            className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
              state.incomeMode === 'custom'
                ? 'bg-bb-violet text-bb-violet-fg border-black'
                : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
            }`}
          >
            Custom
          </button>
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-bb-text-muted text-xs font-mono font-bold select-none">{state.selectedCurrency}</span>
          <input
            ref={customInputRef}
            type="number"
            inputMode="decimal"
            placeholder="Enter custom amount"
            value={state.monthlyIncome}
            onChange={(e) => updateState({ monthlyIncome: e.target.value, incomeMode: 'custom' })}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            className="w-full pl-8 pr-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary placeholder-bb-text-muted focus:outline-none focus:border-bb-violet transition-all font-mono"
            required
          />
        </div>
      </div>
    </motion.div>
  );
};

export const PrimaryGoalStep: React.FC<StepProps> = ({ state, updateState }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <h2 className="text-lg font-black text-bb-text-primary">What are we saving for?</h2>
      <p className="text-xs text-bb-text-muted">Select a category. Your goal helps customize your insights.</p>
    </div>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {GOALS_PRESETS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => updateState({ primaryGoal: g.value, primaryGoalEmoji: g.emoji })}
            className={`p-4 rounded-bb-sm border-2 text-left flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
              state.primaryGoal === g.value
                ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
            }`}
          >
            <span className="text-xl">{g.emoji}</span>
            <span className="text-xs font-semibold">{g.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => updateState({ primaryGoal: 'custom' })}
          className={`p-4 rounded-bb-sm border-2 text-left flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
            state.primaryGoal === 'custom'
              ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
              : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
          }`}
        >
          <span className="text-xl">✨</span>
          <span className="text-xs font-semibold">Something Else</span>
        </button>
      </div>
      {state.primaryGoal === 'custom' && (
        <Input
          type="text"
          placeholder="e.g. Save for concert tickets"
          value={state.customGoalName}
          onChange={(e) => updateState({ customGoalName: e.target.value })}
          required
        />
      )}
    </div>
  </motion.div>
);

export const TargetAmountStep: React.FC<StepProps> = ({ state, updateState }) => {
  const targetCustomRef = useRef<HTMLInputElement>(null);
  const targetPresets = CURRENCY_TARGET_PRESETS[state.selectedCurrency] || CURRENCY_TARGET_PRESETS['₹'];

  useEffect(() => {
    if (state.targetMode === 'custom' && targetCustomRef.current) {
      targetCustomRef.current.focus();
    }
  }, [state.targetMode]);

  return (
    <motion.div {...stepMotion} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-bb-text-primary">How much cash is required?</h2>
        <p className="text-xs text-bb-text-muted">Set a target amount for your goal. You can change this anytime.</p>
      </div>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {targetPresets.map((presetVal) => (
            <button
              key={presetVal}
              type="button"
              onClick={() => updateState({ targetAmount: presetVal.toString(), targetMode: 'preset' })}
              className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                state.targetMode === 'preset' && state.targetAmount === presetVal.toString()
                  ? 'bg-bb-violet text-bb-violet-fg border-black'
                  : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
              }`}
            >
              {formatCurrency(presetVal, state.selectedCurrency, false)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateState({ targetMode: 'custom' })}
            className={`px-4 py-2 rounded-bb-xs text-xs font-bold font-mono transition-all duration-150 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
              state.targetMode === 'custom'
                ? 'bg-bb-violet text-bb-violet-fg border-black'
                : 'bg-bb-surface border-bb-border text-bb-text-secondary hover:border-bb-violet'
            }`}
          >
            Custom
          </button>
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-bb-text-muted text-xs font-mono font-bold select-none">{state.selectedCurrency}</span>
          <input
            ref={targetCustomRef}
            type="number"
            inputMode="decimal"
            placeholder="Enter custom target"
            value={state.targetAmount}
            onChange={(e) => updateState({ targetAmount: e.target.value, targetMode: 'custom' })}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            className="w-full pl-8 pr-4 py-2.5 rounded-bb-sm bg-bb-surface border-2 border-bb-border text-xs text-bb-text-primary placeholder-bb-text-muted focus:outline-none focus:border-bb-violet transition-all font-mono"
            required
          />
        </div>
        {state.targetAmount !== '' && !isNaN(Number(state.targetAmount)) && Number(state.targetAmount) > 0 && (
          <div className="text-xs text-bb-text-muted font-medium">
            Target Amount: <span className="text-bb-violet font-bold font-mono">{formatCurrency(Number(state.targetAmount), state.selectedCurrency, false)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const PaymentMethodsStep: React.FC<StepProps> = ({ state, updateState }) => {
  const handlePaymentToggle = (pm: string) => {
    updateState({
      preferredPayments: state.preferredPayments.includes(pm)
        ? state.preferredPayments.filter((p) => p !== pm)
        : [...state.preferredPayments, pm],
    });
  };

  return (
    <motion.div {...stepMotion} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-black text-bb-text-primary">How do you usually pay?</h2>
        <p className="text-xs text-bb-text-muted">Select your primary payment channels.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((pm) => {
          const isSelected = state.preferredPayments.includes(pm);
          return (
            <button
              key={pm}
              type="button"
              onClick={() => handlePaymentToggle(pm)}
              className={`p-4 rounded-bb-sm border-2 flex items-center justify-between transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
                isSelected
                  ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
                  : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
              }`}
            >
              <span className="text-xs font-semibold">{pm}</span>
              {isSelected && <Check size={12} className="text-bb-violet-fg" />}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export const AIPersonalityStep: React.FC<StepProps> = ({ state, updateState }) => (
  <motion.div {...stepMotion} className="space-y-6">
    <div className="space-y-1">
      <h2 className="text-lg font-black text-bb-text-primary">Pick your AI Bro's personality.</h2>
      <p className="text-xs text-bb-text-muted">Choose the response style that fits your vibe best.</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {PERSONALITIES.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => updateState({ aiPersonality: p.id as any })}
          className={`p-4 rounded-bb-sm border-2 text-left flex flex-col gap-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bb-violet cursor-pointer ${
            state.aiPersonality === p.id
              ? 'border-bb-violet bg-bb-violet text-bb-violet-fg'
              : 'border-bb-border bg-bb-surface text-bb-text-primary hover:border-bb-violet'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{p.emoji}</span>
            <span className="text-xs font-bold">{p.name}</span>
          </div>
          <p className={`text-[10px] leading-normal mt-1 font-semibold ${state.aiPersonality === p.id ? 'text-bb-violet-fg/70' : 'text-bb-text-muted'}`}>{p.desc}</p>
        </button>
      ))}
    </div>
  </motion.div>
);

export const SummaryStep: React.FC<StepProps> = ({ state }) => (
  <motion.div {...stepMotion} className="space-y-5">
    <div className="text-center space-y-1">
      <span className="text-4xl block">◆</span>
      <h2 className="text-lg font-black text-bb-text-primary">Vibe check passed!</h2>
      <p className="text-xs text-bb-text-muted">Review your profile breakdown before locking it in.</p>
    </div>
    <div className="p-4 rounded-bb-sm bg-bb-surface border-2 border-bb-border space-y-2.5 text-xs leading-normal select-none max-h-[300px] overflow-y-auto">
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Companion Name</span>
        <span className="font-bold text-bb-text-primary">{state.preferredName} {state.avatar}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Country</span>
        <span className="font-bold text-bb-text-primary">{state.country}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Birthday</span>
        <span className="font-bold text-bb-text-primary">{state.birthday}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">College / School</span>
        <span className="font-bold text-bb-text-primary truncate max-w-[180px]">{state.college}</span>
      </div>
      {state.shortBio && (
        <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
          <span className="text-bb-text-muted font-mono">Short Bio</span>
          <span className="font-bold text-bb-text-primary truncate max-w-[180px]">{state.shortBio}</span>
        </div>
      )}
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Currency</span>
        <span className="font-bold text-bb-text-primary font-mono">{state.selectedCurrency}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Monthly Allowance</span>
        <span className="font-bold text-bb-text-primary font-mono">{state.selectedCurrency}{Number(state.monthlyIncome).toLocaleString()}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Primary Goal</span>
        <span className="font-bold text-bb-text-primary capitalize">{state.primaryGoal === 'custom' ? state.customGoalName : state.primaryGoal}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Saving Target</span>
        <span className="font-bold text-bb-text-primary font-mono">{formatCurrency(Number(state.targetAmount) || 0, state.selectedCurrency, false)}</span>
      </div>
      <div className="flex justify-between border-b-2 border-bb-border pb-1.5">
        <span className="text-bb-text-muted font-mono">Payment Channels</span>
        <span className="font-bold text-bb-text-primary text-right max-w-[180px] truncate">{state.preferredPayments.join(', ')}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-bb-text-muted font-mono">AI Personality</span>
        <span className="font-bold text-bb-text-primary capitalize">{state.aiPersonality}</span>
      </div>
    </div>
    <p className="text-[10px] text-center text-bb-text-muted max-w-xs mx-auto leading-relaxed font-semibold">
      You're ready to start building healthier financial habits.
    </p>
  </motion.div>
);
