// Shared Avatar component - shows photo if available, else initials
export function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function getColor(name = '') {
  const colors = ['#7c6af7','#3dd68c','#f6ad55','#fc8181','#63b3ed','#f687b3','#68d391']
  return colors[name ? name.charCodeAt(0) % colors.length : 0]
}

export default function Avatar({ name, photoURL, size = 40, onClick }) {
  const color = getColor(name)
  const style = {
    width: size, height: size, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    overflow: 'hidden',
    border: `2px solid ${color}55`,
  }

  if (photoURL) {
    return (
      <div style={style} onClick={onClick}>
        <img src={photoURL} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      </div>
    )
  }

  return (
    <div style={{ ...style, background: color + '33', color }} onClick={onClick}>
      {getInitials(name)}
    </div>
  )
}
