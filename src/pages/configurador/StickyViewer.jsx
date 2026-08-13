// src/pages/configurador/StickyViewer.jsx
export default function StickyViewer({ activeImgUrl, thumbnails, onSelectThumbnail, altText }) {
  return (
    <div className="cfg2-viewer">
      <div className={`cfg2-stage ${activeImgUrl ? 'cfg2-has-img' : ''}`}>
        {activeImgUrl && <img src={activeImgUrl} alt={altText} />}
      </div>
      {thumbnails.length > 0 && (
        <div className="cfg2-thumbs">
          {thumbnails.map(t => (
            <button
              key={t.id}
              type="button"
              className={`cfg2-thumb ${activeImgUrl === t.url ? 'cfg2-active' : ''}`}
              onClick={() => onSelectThumbnail(t.url)}
            >
              <img src={t.url} alt={t.alt || altText} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
