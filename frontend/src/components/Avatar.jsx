export default function Avatar({ initials, size = 34, innerBg = '#111116', fontSize = 11 }) {
  const ringPad = size >= 38 ? 3.5 : 3
  return (
    <div className="cb-avatar" style={{ width: size, height: size }}>
      <div
        className="cb-avatar-inner"
        style={{
          width: size - ringPad * 2,
          height: size - ringPad * 2,
          background: innerBg,
          fontSize,
        }}
      >
        {initials}
      </div>
    </div>
  )
}
