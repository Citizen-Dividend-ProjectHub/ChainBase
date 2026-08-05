export default function Avatar({ initials, size = 34, fontSize = 11 }) {
  return (
    <div className="cb-avatar" style={{ width: size, height: size }}>
      <span className="cb-avatar-inner" style={{ fontSize }}>{initials}</span>
    </div>
  )
}
