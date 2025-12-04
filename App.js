import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Eraser, Upload, Play, RefreshCw, PenTool } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './App.css';

// Đăng ký ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const FEATURES = [
  { id: 'f1', name: 'Feature 1: Normalized Pixels (Chuẩn hóa)' },
  { id: 'f2', name: 'Feature 2: Edge Features (Đường biên)' },
  { id: 'f3', name: 'Feature 3: Block Averaging (Trung bình khối)' },
  { id: 'f4', name: 'Feature 4: Binarized Pixels (Nhị phân)' },
  { id: 'f5', name: 'Feature 5: Projection (Hình chiếu)' },
];

function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState('f1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 30; 
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // xử lý vẽ trên canvas
  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  const getCoordinates = (e) => {
    if (e.touches && e.touches[0]) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top
      };
    }
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
    setConfidence(null);
    setError('');
  };

  // xử lý ảnh và gọi api
  const getPixelData = () => {
    const canvas = canvasRef.current;
    

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(canvas, 0, 0, 28, 28);

    // lấy dữ liệu pixel
    const imageData = tempCtx.getImageData(0, 0, 28, 28);
    const data = imageData.data;
    const grayscalePixels = [];
    for (let i = 0; i < data.length; i += 4) {
      grayscalePixels.push(data[i]); 
    }

    return grayscalePixels;
  };

  const handlePredict = async () => {
    setLoading(true);
    setError('');
    const pixels = getPixelData();

    try {
      // const response = await axios.post('http://127.0.0.1:5000/predict', {
      const response = await axios.post('https://lab02-ml-flask.onrender.com/predict', {
        pixels: pixels,
        feature_type: selectedFeature
      });

      setPrediction(response.data.result);
      setConfidence(response.data.confidence);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối Server! Đảm bảo backend đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  // handle upload ảnh
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        

        ctx.drawImage(img, 0, 0, 280, 280);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // dữ liệu biểu đồ
  const chartData = {
    labels: ['Độ tin cậy'],
    datasets: [
      {
        label: `Dự đoán: Số ${prediction !== null ? prediction : '?'}`,
        data: [confidence || 0],
        backgroundColor: confidence > 80 ? '#4ade80' : '#facc15', // Xanh nếu tự tin, Vàng nếu nghi ngờ
        borderColor: confidence > 80 ? '#22c55e' : '#eab308',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, max: 100 },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Nhận Diện Chữ Số Viết Tay</h1>
        <p>Vẽ một chữ số từ 0 đến 9 vào khung bên dưới</p>
      </header>

      <div className="main-content">
        {/* phần vẽ và điều khiển */}
        <div className="card left-panel">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="drawing-canvas"
            />
          </div>

          <div className="controls">
            <div className="feature-select">
              <label>Chọn Phương Pháp (Feature):</label>
              <select 
                value={selectedFeature} 
                onChange={(e) => setSelectedFeature(e.target.value)}
              >
                {FEATURES.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="button-group">
              <button className="btn btn-secondary" onClick={clearCanvas}>
                <Eraser size={18} /> Xóa
              </button>
              
              <label className="btn btn-secondary upload-btn">
                <Upload size={18} /> Upload Ảnh
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
              </label>

              <button className="btn btn-primary" onClick={handlePredict} disabled={loading}>
                {loading ? <RefreshCw className="spin" size={18} /> : <Play size={18} />}
                {loading ? ' Đang xử lý...' : ' Dự Đoán'}
              </button>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </div>

        {/* phần kết quả */}
        <div className="card right-panel">
          <div className="result-display">
            <h2>KẾT QUẢ DỰ ĐOÁN</h2>
            <div className={`prediction-number ${prediction === null ? 'placeholder' : ''}`}>
              {prediction !== null ? prediction : '?'}
            </div>
            
            {prediction !== null && (
              <div className="confidence-chart">
                <p>Độ tin cậy: <strong>{confidence}%</strong></p>
                <div className="chart-container">
                   <Bar data={chartData} options={chartOptions} />
                </div>
                <div className="feature-info">
                  <small>Đã sử dụng: <strong>{FEATURES.find(f => f.id === selectedFeature)?.name}</strong></small>
                </div>
              </div>
            )}
            
            {prediction === null && (
              <div className="empty-state">
                <PenTool size={48} opacity={0.2} />
                <p>Hãy vẽ số và nhấn "Dự Đoán"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;