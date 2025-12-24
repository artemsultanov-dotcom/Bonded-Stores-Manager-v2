import React from 'react';
import { LayoutDashboard, Users, Package, ShoppingCart, FileBarChart, RefreshCw, BookOpen, Database, Mail } from 'lucide-react';

interface InstructionProps {
  t: (key: string) => string;
}

export const Instruction: React.FC<InstructionProps> = ({ t }) => {
  const steps = [
    {
      title: t('inst_step1_title'),
      desc: t('inst_step1_desc'),
      icon: LayoutDashboard,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
      title: t('inst_step2_title'),
      desc: t('inst_step2_desc'),
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30"
    },
    {
      title: t('inst_step3_title'),
      desc: t('inst_step3_desc'),
      icon: Package,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30"
    },
    {
      title: t('inst_step4_title'),
      desc: t('inst_step4_desc'),
      icon: ShoppingCart,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/30"
    },
    {
      title: t('inst_step5_title'),
      desc: t('inst_step5_desc'),
      icon: FileBarChart,
      color: "text-cyan-600",
      bg: "bg-cyan-100 dark:bg-cyan-900/30"
    },
    {
      title: t('inst_step6_title'),
      desc: t('inst_step6_desc'),
      icon: RefreshCw,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/30"
    },
    {
      title: t('inst_step7_title'),
      desc: t('inst_step7_desc'),
      icon: Database,
      color: "text-slate-600",
      bg: "bg-slate-200 dark:bg-slate-700"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">{t('inst_title')}</h2>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-row items-start gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl shrink-0 ${step.bg}`}>
              <step.icon className={`w-6 h-6 ${step.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Contact Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 p-6 flex flex-row items-start gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-xl shrink-0">
          <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-1">{t('inst_contact_title')}</h3>
          <p className="text-blue-700 dark:text-blue-400 leading-relaxed text-sm">
            For any questions regarding the application, suggestions for improvements, or change requests, please reach out to the developer via E-mail: <a href="mailto:artem.sultanov@gmail.com" className="text-blue-600 dark:text-blue-300 font-bold hover:underline">artem.sultanov@gmail.com</a>
          </p>
        </div>
      </div>
      
      <div className="mt-8 bg-slate-100 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-lg">Pro Tip</h4>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
           Always export your PDF reports <strong>before</strong> clicking the "Start New Month" button. Once reset, the transaction history for the previous month is cleared from the device to keep the app fast and focused on the current period. Use the <strong>Save Project</strong> feature regularly to create backups.
        </p>
      </div>

      <div className="mt-12 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        {t('app_author')}
      </div>
    </div>
  );
};