import React, { useState, useRef } from 'react';
import { Upload, Play, Pause } from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';

function App() {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shaderType, setShaderType] = useState<'ripple' | 'lightning'>(
    'ripple'
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl font-bold mb-8">WebGL Shader Audio Visualizer</h1>
      <div className="w-full max-w-md">
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center mb-4"
        >
          <Upload className="mr-2" />
          <span>Upload Song</span>
          <input
            id="file-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        {audioSrc && (
          <div className="mt-4">
            <button
              onClick={togglePlayPause}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            >
              {isPlaying ? (
                <Pause className="mr-2" />
              ) : (
                <Play className="mr-2" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <audio ref={audioRef} src={audioSrc} />
          </div>
        )}
        <div className="mt-4">
          <label htmlFor="shader-select" className="block mb-2">
            Select Shader:
          </label>
          <select
            id="shader-select"
            value={shaderType}
            onChange={(e) =>
              setShaderType(e.target.value as 'ripple' | 'lightning')
            }
            className="bg-gray-700 text-white rounded px-3 py-2 w-full"
          >
            <option value="ripple">Ripple</option>
            <option value="lightning">Lightning</option>
            <option value="plasma">Plasma</option>
            <option value="fractal">Fractal</option>
            <option value="particles">Particles</option>
            <option value="pulse">Pulse</option>
            <option value="spiralFluid">SpiralFluid</option>
            <option value="lightResponsive">LightResponsive</option>
            <option value="enhancedPlasmaShader">EnhancedPlasmaShader</option>
          </select>
        </div>
      </div>
      {audioSrc && (
        <div className="mt-8 w-full max-w-4xl h-64">
          <AudioVisualizer
            audioElement={audioRef.current}
            shaderType={shaderType}
          />
        </div>
      )}
    </div>
  );
}

export default App;
