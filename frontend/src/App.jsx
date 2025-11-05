
import React, { useState } from 'react';
import './App.css'; 

function Game() {

  const [gamePhase, setGamePhase] = useState('start');
  const [isLoading, setIsLoading] = useState(false);

  const [nValue, setNValue] = useState(null);
  const [results, setResults] = useState([]);
  const [guess, setGuess] = useState('');
  const [finalScore, setFinalScore] = useState(null);

  const handleGenerate = () => {
    setIsLoading(true);
    setGamePhase('guessing'); 
    setFinalScore(null);
    setResults([]);
    setNValue(null);

    fetch('http://localhost:5000/api/run-benchmark')
      .then(response => response.json())
      .then(data => {
        setNValue(data.n_queens);
        setResults(data.results);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Eroare la apelul API:', error);
        setIsLoading(false);
        setGamePhase('start');
      });
  };

  
  const handleGuessSubmit = (e) => {
    e.preventDefault();
    if (!results.length) return;

    const userGuess = guess.trim();
    const guessedAlgo = results.find(
      r => r.name.toLowerCase() === userGuess.toLowerCase()
    );

    if (!guessedAlgo) {
      alert("Numele algoritmului nu a fost găsit. Încercați din nou (ex: 'DFS', 'BKT (DFS Fără Viz)')");
      return;
    }

    const validResults = results.filter(r => isFinite(r.duration_sec));
    if (validResults.length === 0) {
        alert("Toți algoritmii au eșuat!");
        return;
    }

    validResults.sort((a, b) => a.duration_sec - b.duration_sec);

    const bestTime = validResults[0].duration_sec;
    const worstTime = validResults[validResults.length - 1].duration_sec;
    const userTime = guessedAlgo.duration_sec;

    let score = 0;
    const timeRange = worstTime - bestTime;
    const userError = userTime - bestTime;

    if (timeRange === 0) {
      score = (userTime === bestTime) ? 100 : 0;
    } else {
      score = 100 * (1 - (userError / timeRange));
    }
    if (score < 0) score = 0;

    setFinalScore(score.toFixed(0)); 
    setGamePhase('results'); 
    setGuess(''); 
  };

  const getSortedResults = () => {
    return [...results].sort((a, b) => a.duration_sec - b.duration_sec);
  };

  return (
    <div className="game-container">
      <h1>Generator Intrebari AI</h1>
      
      <button onClick={handleGenerate} disabled={isLoading} className="generate-button">
        {isLoading ? 'Se generează...' : 'Generează Întrebare'}
      </button>

      {gamePhase === 'guessing' && (
        <div>
          {nValue ? (
            <>
              <h2>Problema N-Queens: Pentru o tabla de sah de marime {nValue} x {nValue}, care este algoritmul cel mai eficient, din punct de vedere al timpului de executie, pentru gasirea unei solutii?</h2>
              <form onSubmit={handleGuessSubmit} className="guessing-form">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Introduceți numele algoritmului"
                  className="guess-input"
                />
                <button type="submit" className="guess-button">Ghicește</button>
              </form>
            </>
          ) : (
            <p className="loading-text">Se încarcă întrebarea...</p>
          )}
        </div>
      )}

      {gamePhase === 'results' && (
        <div className="results-container">
          <h2>Scorul tău: {finalScore}%</h2>
          <p>Tabela de scor completă pentru N = {nValue}:</p>
          
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Algoritm</th>
                <th>Timp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {getSortedResults().map((res, index) => (
                <tr key={res.name}>
                  <td>{index + 1}</td>
                  <td>{res.name}</td>
                  <td>{res.duration_str}</td>
                  <td>{res.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Game;