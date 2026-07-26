const WASH = { green: 'wash-green', blue: 'wash-blue', gold: 'wash-gold', red: 'wash-red', yellow: 'wash-gold' }
const VALUE = { green: 'green', blue: 'blue', gold: 'gold', red: 'red', yellow: 'gold' }

export default function StatCard({ label, value, sub, hue, color }) {
  const h = hue ?? color
  return (
    <div className={`stat-card${h ? ' ' + WASH[h] : ''}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value${h ? ' ' + VALUE[h] : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
