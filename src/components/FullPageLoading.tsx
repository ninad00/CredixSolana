import { LoadingSpinner } from './LoadingSpinner';

export const FullPageLoading = () => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-8 rounded-2xl shadow-xl border border-border">
        <LoadingSpinner className="w-full" />
      </div>
    </div>
  );
};
