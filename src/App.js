import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const knownFrameworks = ['react', 'next', 'vue', 'angular', 'express', 'nestjs', 'svelte'];

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setUsersData([]);

    const usernames = input.split(',').map(u => u.trim()).filter(Boolean);
    const allData = [];

    try {
      for (const username of usernames) {
        const userRes = await axios.get(`https://api.github.com/users/${username}`);
        const reposRes = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`);

        const languageStats = await getLanguageStats(username, reposRes.data);
        const frameworkStats = await detectFrameworks(username, reposRes.data);

        allData.push({
          user: userRes.data,
          repos: reposRes.data,
          languageStats,
          frameworkStats
        });
      }

      setUsersData(allData);
    } catch (err) {
      setError('Erro ao buscar dados de um ou mais usuários.');
    } finally {
      setLoading(false);
    }
  };

  const getLanguageStats = async (username, repos) => {
    const languageTotals = {};
    const limitedRepos = repos.slice(0, 20);

    for (const repo of limitedRepos) {
      try {
        const langRes = await axios.get(`https://api.github.com/repos/${username}/${repo.name}/languages`);
        const langs = langRes.data;
        for (const [lang, bytes] of Object.entries(langs)) {
          languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
        }
      } catch (err) {
        console.warn(`Erro em ${repo.name}`);
      }
    }

    const total = Object.values(languageTotals).reduce((a, b) => a + b, 0);

    return Object.entries(languageTotals)
      .map(([lang, bytes]) => ({
        language: lang,
        percentage: ((bytes / total) * 100).toFixed(2)
      }))
      .sort((a, b) => b.percentage - a.percentage);
  };

  const detectFrameworks = async (username, repos) => {
    const frameworkCounts = {};
    const limitedRepos = repos.slice(0, 20);

    for (const repo of limitedRepos) {
      try {
        const res = await axios.get(`https://api.github.com/repos/${username}/${repo.name}/contents/package.json`);
        const file = res.data;
        const decoded = atob(file.content);
        const packageJson = JSON.parse(decoded);

        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        for (const fw of knownFrameworks) {
          if (deps && Object.keys(deps).some(dep => dep.toLowerCase().includes(fw))) {
            frameworkCounts[fw] = (frameworkCounts[fw] || 0) + 1;
          }
        }
      } catch (err) {
        // Ignora repositórios sem package.json
      }
    }

    return frameworkCounts;
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>Comparador de Usuários GitHub</h1>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ex: guilherme, messias , matheus "
        style={{ padding: 8, width: 400 }}
      />
      <button onClick={handleSearch} style={{ padding: 8, marginLeft: 10 }}>
        Buscar
      </button>

      {loading && <p>Carregando dados...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {usersData.map(({ user, repos, languageStats, frameworkStats }) => (
        <div key={user.login} style={{ border: '1px solid #ccc', padding: 20, marginTop: 30, borderRadius: 10 }}>
          <h2>{user.name || user.login}</h2>
          <img src={user.avatar_url} alt="avatar" width={80} style={{ borderRadius: '50%' }} />
          <p>{user.bio}</p>
          <p>📍 {user.location || 'Localização não informada'}</p>
          <p>👥 {user.followers} seguidores | Seguindo {user.following}</p>
          <p>📦 {user.public_repos} repositórios públicos</p>

          <h3 style={{ marginTop: 20 }}>Estatísticas de Linguagens:</h3>
          <ul>
            {languageStats.map((lang) => (
              <li key={lang.language}>
                <strong>{lang.language}</strong>: {lang.percentage}%
              </li>
            ))}
          </ul>

          {Object.keys(frameworkStats).length > 0 && (
            <>
              <h3>Frameworks detectados:</h3>
              <ul>
                {Object.entries(frameworkStats).map(([fw, count]) => (
                  <li key={fw}>
                    <strong>{fw}</strong>: {count} repositório(s)
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 style={{ marginTop: 20 }}>Repositórios:</h3>
          <ul>
            {repos.map((repo) => (
              <li key={repo.id} style={{ marginBottom: 10 }}>
                <a href={repo.html_url} target="_blank" rel="noreferrer">
                  <strong>{repo.name}</strong>
                </a>
                <br />
                Linguagem: {repo.language || 'Não especificada'}<br />
                ⭐ {repo.stargazers_count} | 🍴 {repo.forks_count}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default App;
