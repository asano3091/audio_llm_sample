
import React, { useState, useCallback, useRef } from 'react';
import { analyzeAudio } from './services/geminiService';
import { ExtractionResult, AppState } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    file: null,
    isProcessing: false,
    result: null,
    error: null,
    csvHeaderTemplate: '名前, 電話番号, 要約',
    apiKey: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'audio/wav' && !selectedFile.name.endsWith('.wav')) {
        setState(prev => ({ ...prev, error: 'WAVファイルのみ対応しています。', file: null }));
        return;
      }
      setState(prev => ({ ...prev, file: selectedFile, error: null, result: null }));
    }
  };

  const handleProcess = async () => {
    if (!state.file) return;
    if (!state.apiKey.trim()) {
      setState(prev => ({ ...prev, error: 'Gemini APIキーを入力してください。' }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const base64 = await fileToBase64(state.file);
      const result = await analyzeAudio(state.apiKey.trim(), base64, state.file.type || 'audio/wav');
      setState(prev => ({ ...prev, result, isProcessing: false }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: '音声の解析中にエラーが発生しました。APIキーが正しいか、ファイル形式が適切か確認してください。' 
      }));
    }
  };

  const handleDownloadCSV = () => {
    if (!state.result) return;

    const headers = state.csvHeaderTemplate;
    // We escape double quotes for CSV safety
    const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    
    const row = [
      escape(state.result.name),
      escape(state.result.phoneNumber),
      escape(state.result.summary)
    ].join(',');

    const csvContent = `${headers}\n${row}`;
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extraction_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setState(prev => ({
      ...prev,
      file: null,
      isProcessing: false,
      result: null,
      error: null,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg mb-4">
          <i className="fas fa-microphone-lines text-white text-3xl"></i>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Audio Insight
        </h1>
        <p className="text-slate-500 text-lg">
          留守電や通話録音から連絡先を自動抽出
        </p>
      </header>

      <main className="space-y-8">
        {/* Settings Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-key"></i>
                <span>Gemini API Key</span>
              </label>
              <input
                type="password"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                value={state.apiKey}
                onChange={(e) => setState(prev => ({ ...prev, apiKey: e.target.value, error: null }))}
                placeholder="AIZA..."
              />
            </div>

            {/* CSV Settings */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-file-csv"></i>
                <span>CSV出力設定 (カラム名)</span>
              </label>
              <input
                type="text"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                value={state.csvHeaderTemplate}
                onChange={(e) => setState(prev => ({ ...prev, csvHeaderTemplate: e.target.value }))}
                placeholder="名前, 電話番号, 要約"
              />
            </div>
          </div>

          <div className="border-t border-slate-50 pt-6">
            {!state.file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".wav" 
                  className="hidden" 
                />
                <div className="bg-slate-100 group-hover:bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                  <i className="fas fa-cloud-upload-alt text-2xl text-slate-400 group-hover:text-indigo-600"></i>
                </div>
                <p className="text-lg font-medium text-slate-700">WAVファイルをドロップまたはクリック</p>
                <p className="text-sm text-slate-400 mt-2">最大ファイルサイズ: 10MB推奨</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-file-audio text-indigo-600 text-xl"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 truncate max-w-[200px] md:max-w-md">
                        {state.file.name}
                      </p>
                      <p className="text-sm text-slate-500">{(state.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={reset}
                    className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                    title="ファイルを削除"
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <audio 
                    controls 
                    className="w-full h-10" 
                    src={URL.createObjectURL(state.file)}
                  />
                </div>

                {!state.result && !state.isProcessing && (
                  <button 
                    onClick={handleProcess}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    <span>AIで解析を開始する</span>
                  </button>
                )}

                {state.isProcessing && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-indigo-600 font-semibold animate-pulse">解析中... 数秒かかります</p>
                    <p className="text-slate-400 text-sm mt-2">Gemini AIが音声を聴き取っています</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {state.error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
              <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
              <p className="text-red-700 text-sm font-medium">{state.error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {state.result && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={handleDownloadCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center space-x-2 font-bold"
              >
                <i className="fas fa-download"></i>
                <span>CSVダウンロード</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Quick Stats */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">抽出情報</h3>
                  <div className="space-y-4">
                    <InfoItem icon="fa-user" label="お名前" value={state.result.name || '不明'} highlight={!!state.result.name} />
                    <InfoItem icon="fa-phone" label="電話番号" value={state.result.phoneNumber || '不明'} highlight={!!state.result.phoneNumber} />
                    <InfoItem 
                      icon="fa-venus-mars" 
                      label="推定性別" 
                      value={state.result.gender === 'male' ? '男性' : state.result.gender === 'female' ? '女性' : '不明'} 
                    />
                    <div className="pt-4 border-t border-slate-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400 font-medium">信頼度</span>
                        <span className="text-xs font-bold text-indigo-600">{(state.result.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div 
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000" 
                          style={{ width: `${state.result.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl shadow-lg text-white">
                  <h3 className="text-sm font-bold text-indigo-100 uppercase tracking-wider mb-3">要約</h3>
                  <p className="text-sm leading-relaxed opacity-90">
                    {state.result.summary}
                  </p>
                </div>
              </div>

              {/* Transcription */}
              <div className="md:col-span-2">
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                      <i className="fas fa-align-left text-indigo-500"></i>
                      <span>文字起こし</span>
                    </h3>
                    <button 
                      onClick={() => navigator.clipboard.writeText(state.result?.transcription || '')}
                      className="text-slate-400 hover:text-indigo-600 text-sm font-medium flex items-center space-x-1"
                    >
                      <i className="fas fa-copy"></i>
                      <span>コピー</span>
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-slate-700 leading-loose whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar">
                    {state.result.transcription || "（文字起こし内容がありません）"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-slate-400 text-sm">
        <p>© 2024 Audio Insight AI • Gemini 3 Flash powered</p>
      </footer>

      {/* Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

interface InfoItemProps {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, highlight }) => (
  <div className="flex items-center space-x-3 group">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'} transition-colors`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight leading-none mb-1">{label}</p>
      <p className={`font-semibold truncate ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>
        {value}
      </p>
    </div>
  </div>
);

export default App;
