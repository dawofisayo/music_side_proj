export const SONG_DATABASE = [
    {
      id: 1,
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      spotifyId: "0VjIjW4GlUZAMYd2vXMi3b",
      youtubeId: "4NRXx6U8ABQ", // Official music video
      releaseYear: 2019
    },
    {
      id: 2,
      title: "Shape of You",
      artist: "Ed Sheeran",
      album: "÷",
      spotifyId: "7qiZfU4dY1lWllzX7mPBI0",
      youtubeId: "JGwWNGJdvx8",
      releaseYear: 2017
    },
    {
      id: 3,
      title: "Levitating",
      artist: "Dua Lipa",
      album: "Future Nostalgia",
      spotifyId: "39LLxExYz6ewLAcYrzQQyP",
      youtubeId: "TUVcZfQe-Kw",
      releaseYear: 2020
    },
    {
      id: 4,
      title: "Watermelon Sugar",
      artist: "Harry Styles",
      album: "Fine Line",
      spotifyId: "6UelLqGlWMcVH1E5c4H7lY",
      youtubeId: "E07s5ZYygMg",
      releaseYear: 2019
    },
    {
      id: 5,
      title: "Bad Guy",
      artist: "Billie Eilish",
      album: "WHEN WE ALL FALL ASLEEP",
      spotifyId: "2Fxmhks0bxGSBdJ92vM42m",
      youtubeId: "DyDfgMOUjCI",
      releaseYear: 2019
    },
    {
      id: 6,
      title: "Dance Monkey",
      artist: "Tones and I",
      album: "The Kids Are Coming",
      spotifyId: "2XU0oxnq2qxCpomAAuJY8K",
      youtubeId: "q0hyYWKXF0Q",
      releaseYear: 2019
    },
    {
      id: 7,
      title: "Circles",
      artist: "Post Malone",
      album: "Hollywood's Bleeding",
      spotifyId: "21jGcNKet2qwijlDFuPiPb",
      youtubeId: "wXhTHyIgQ_U",
      releaseYear: 2019
    },
    {
      id: 8,
      title: "Someone Like You",
      artist: "Adele",
      album: "21",
      spotifyId: "1zwMYTA5nlNjZxYrvBB2pV",
      youtubeId: "hLQl3WQQoQ0",
      releaseYear: 2011
    },
  ];
  
  export function getDailySong() {
    const today = new Date();
    const startDate = new Date('2024-01-01');
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const songIndex = daysSinceStart % SONG_DATABASE.length;
    return SONG_DATABASE[songIndex];
  }