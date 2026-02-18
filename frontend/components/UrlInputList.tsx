import React from 'react';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';

interface UrlInputListProps {
  label: string;
  urls: string[];
  setUrls: (urls: string[]) => void;
  placeholder?: string;
  required?: boolean;
  addUrlLabel?: string;
  removeUrlLabel?: string;
  emptyLabel?: string;
}

export const UrlInputList: React.FC<UrlInputListProps> = ({
  label,
  urls,
  setUrls,
  placeholder = "https://...",
  required = false,
  addUrlLabel = "Thêm URL",
  removeUrlLabel = "Xóa URL",
  emptyLabel = 'Chưa có URL nào. Nhấn "Thêm URL" để nhập.',
}) => {
  const addUrl = () => {
    setUrls([...urls, '']);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  const handleChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-semibold text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          onClick={addUrl}
          className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
          type="button"
        >
          <Plus size={14} /> {addUrlLabel}
        </button>
      </div>
      
      <div className="space-y-3">
        {urls.map((url, index) => (
          <div key={index} className="flex gap-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon size={16} className="text-gray-500" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block pl-10 p-2.5 transition-all placeholder-gray-600"
              />
            </div>
            {urls.length > (required ? 1 : 0) && (
              <button
                onClick={() => removeUrl(index)}
                className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                type="button"
                title={removeUrlLabel}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {urls.length === 0 && !required && (
             <div className="text-xs text-gray-500 italic p-2 border border-dashed border-gray-700 rounded text-center">
                 {emptyLabel}
             </div>
        )}
      </div>
    </div>
  );
};