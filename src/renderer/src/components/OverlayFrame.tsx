import type { Passage } from '@shared/types'

interface Props {
  passage: Passage | null
  visible: boolean
}

export default function OverlayFrame({ passage, visible }: Props): React.JSX.Element {
  const classes = ['ov']
  if (visible && passage) classes.push('is-visible')
  return (
    <div className={classes.join(' ')} data-fit={passage?.fit ?? 'm'}>
      <div className="ov-inner">
        <p className="ov-verse" dangerouslySetInnerHTML={{ __html: passage?.html ?? '' }} />
        <div className="ov-meta">
          <span className="ov-ref">{passage?.reference ?? ''}</span>
          <span className="ov-sep"></span>
          <span className="ov-ver">{passage?.version ?? ''}</span>
        </div>
      </div>
      <p className="ov-credit">{passage?.credit ?? ''}</p>
    </div>
  )
}
