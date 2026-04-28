"use client";
import { useState, useEffect } from "react";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState("");
  const [showDonate, setShowDonate] = useState(false);

  // KENDI API KEYINI BURAYA YAZ
  const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=tr-TR&page=1`);
        const data = await res.json();
        setMovies(data.results || []);
      } catch (err) {
        console.error("Filmler yuklenemedi", err);
      }
    };
    fetchMovies();
  }, [API_KEY]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${search}&language=tr-TR`);
    const data = await res.json();
    setMovies(data.results || []);
  };

  return (
    <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", color: "#FFDD00", fontSize: "3rem", fontWeight: "bold" }}>SİNEPRO</h1>

      <form onSubmit={handleSearch} style={{ textAlign: "center", marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Film ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "15px", width: "85%", maxWidth: "500px", borderRadius: "30px", border: "none", color: "#000", fontSize: "16px" }}
        />
      </form>

      <div className="movie-grid">
        {movies && movies.length > 0 ? (
          movies.map((movie) => (
            <div key={movie.id} className="movie-card">
              <img
                src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "https://via.placeholder.com/500x750?text=Resim+Yok"}
                alt={movie.title}
              />
              <div style={{ padding: "15px", textAlign: "center" }}>
                <h3 style={{ fontSize: "14px", margin: "0", color: "#fff", height: "40px", overflow: "hidden" }}>{movie.title}</h3>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: "center", width: "100%" }}>Filmler yükleniyor veya bulunamadı...</p>
        )}
      </div>

      {/* Bağış Butonu - Döngünün Tamamen Dışında */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        {showDonate && (
          <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #FFDD00', width: '260px', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#FFDD00', textAlign: 'center' }}>🎬 SinePro'ya Destek Ol</h3>
            <div style={{ backgroundColor: '#222', padding: '10px', borderRadius: '10px', fontSize: '11px', textAlign: 'center' }}>
              <strong>IBAN:</strong><br/>
              <code>TR00 0000 0000 0000 0000 00</code><br/>
              <span>Faruk Ömer</span>
            </div>
            <button onClick={() => setShowDonate(false)} style={{ marginTop: '10px', width: '100%', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Kapat</button>
          </div>
        )}
        <button 
          onClick={() => setShowDonate(!showDonate)}
          style={{ backgroundColor: '#FFDD00', color: '#000', padding: '15px 25px', borderRadius: '50px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}
        >
          ☕ Kahve Ismarla
        </button>
      </div>
    </main>
  );
}