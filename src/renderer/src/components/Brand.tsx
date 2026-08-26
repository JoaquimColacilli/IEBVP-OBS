interface Props {
  size?: number
}

export function Mark({ size = 20 }: Props): React.JSX.Element {
  return (
    <svg className="mark" viewBox="0 0 1024 1024" width={size} height={size} aria-hidden="true">
      <path
        d="M88 652 Q512 578 936 652 L936 834 Q512 910 88 834 Z"
        fill="currentColor"
        opacity="0.42"
      />
      <path d="M148 400 Q322 312 462 368 L462 748 Q322 692 148 768 Z" fill="currentColor" />
      <path d="M876 400 Q702 312 562 368 L562 748 Q702 692 876 768 Z" fill="currentColor" />
    </svg>
  )
}

export default function Brand(): React.JSX.Element {
  return (
    <div className="wordmark">
      <Mark />
      <span className="wordmark-name">Versículos</span>
      <span className="wordmark-tag">IEBVP</span>
    </div>
  )
}
