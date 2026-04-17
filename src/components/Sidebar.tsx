import { ViewMode } from "../App";

interface SidebarProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  status: string;
}

export default function Sidebar({ view, setView, status }: SidebarProps) {
  return (
    <aside className="col-nav" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      width: '260px', 
      borderRight: '1px solid #111', 
      flexShrink: 0, 
      backgroundColor: '#000' 
    }}>
      <div className="brand" style={{ 
        padding: '30px 25px', 
        fontSize: '1.4rem', 
        fontWeight: 900, 
        color: '#1db954', 
        letterSpacing: '2px' 
      }}>
        MAESTRO
      </div>
      
      <div className="nav-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}>
        <nav className="nav-group">
          <div 
            className={`nav-item ${view === "NowPlaying" ? "active" : ""}`} 
            onClick={() => setView("NowPlaying")} 
            style={{ 
              marginBottom: '10px', 
              color: view === "NowPlaying" ? "#1db954" : "#fff", 
              cursor: 'pointer', 
              padding: '12px', 
              borderRadius: '8px', 
              fontWeight: 600 
            }}
          >
            Now Playing
          </div>

          <label style={{ fontSize: '0.65rem', opacity: 0.4, padding: '20px 12px 10px', letterSpacing: '1.5px' }}>
            SERVICES
          </label>
          <div 
            className={`nav-item ${view === "Library" ? "active" : ""}`} 
            onClick={() => setView("Library")} 
            style={{ cursor: 'pointer', padding: '12px', opacity: view === "Library" ? 1 : 0.6 }}
          >
            Local Library
          </div>
          <div 
            className={`nav-item ${view === "YouTube" ? "active" : ""}`} 
            onClick={() => setView("YouTube")} 
            style={{ cursor: 'pointer', padding: '12px', opacity: view === "YouTube" ? 1 : 0.6 }}
          >
            YouTube Music
          </div>
        </nav>

        <nav className="nav-group" style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '0.65rem', opacity: 0.4, padding: '10px 12px', letterSpacing: '1.5px' }}>
            MY LIBRARY
          </label>
          {(["Albums", "Artists", "Genres", "Playlists", "Trending"] as ViewMode[]).map((m) => (
            <div 
              key={m} 
              className={`nav-item ${view === m ? "active" : ""}`} 
              onClick={() => setView(m)} 
              style={{ cursor: 'pointer', padding: '12px', opacity: view === m ? 1 : 0.6 }}
            >
              {m}
            </div>
          ))}
        </nav>
      </div>

      <div className="nav-footer" style={{ padding: '20px', borderTop: '1px solid #111', fontSize: '0.7rem', opacity: 0.5 }}>
        <span style={{ color: '#1db954', marginRight: '8px' }}>●</span> {status}
      </div>
    </aside>
  );
}
