import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

const RadarPerformance = ({ data, athleteName }) => {
  // Regra: se qualquer nota < 5.0, a borda do radar fica vermelha
  const lowPerformance = data.some(d => d.A < 5);
  const strokeColor = lowPerformance ? '#FF4B4B' : '#00e5ff';

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 10]} 
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name={athleteName}
            dataKey="A"
            stroke={strokeColor}
            strokeWidth={3}
            fill="#00e5ff"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarPerformance;
