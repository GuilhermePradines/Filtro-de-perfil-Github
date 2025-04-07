import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [token, setToken] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [minRepos, setMinRepos] = useState(5);
  const [minStars, setMinStars] = useState(10);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const query = `
      {
        search(query: "location:Brazil followers:>100 language:${language}", type: USER, first: 5) {
          edges {
            node {
              ... on User {
                login
                name
                location
                followers {
                  totalCount
                }
                url
                repositories(first: 10, privacy: PUBLIC, orderBy: {field: STARGAZERS, direction: DESC}) {
                  nodes {
                    name
                    url
                    stargazerCount
                    forkCount
                    primaryLanguage {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const res = await axios.post(
        "https://api.github.com/graphql",
        { query },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = res.data.data.search.edges
        .map(({ node }) => {
          const filteredRepos = node.repositories.nodes.filter(
            (repo) =>
              repo.primaryLanguage?.name === language &&
              repo.stargazerCount >= minStars
          );
          return {
            ...node,
            repositories: filteredRepos,
          };
        })
        .filter((user) => user.repositories.length >= minRepos);

      setUsers(result);
    } catch (error) {
      console.error("Erro:", error.response?.data || error.message);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1>🔍 Filtro de Perfis GitHub</h1>

      <div className="form">
        <input
          type="text"
          placeholder="Token do GitHub"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <input
          type="text"
          placeholder="Linguagem (ex: JavaScript)"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />
        <input
          type="number"
          placeholder="Mínimo de repositórios"
          value={minRepos}
          onChange={(e) => setMinRepos(Number(e.target.value))}
        />
        <input
          type="number"
          placeholder="Mínimo de estrelas por repo"
          value={minStars}
          onChange={(e) => setMinStars(Number(e.target.value))}
        />
        <button onClick={fetchUsers}>Buscar Perfis</button>
      </div>

      {loading && <p>Carregando...</p>}

      <div className="results">
        {users.map((user) => (
          <div key={user.login} className="user-card">
            <h2>{user.name || user.login}</h2>
            <p>👥 {user.followers.totalCount} seguidores</p>
            <p>📍 {user.location}</p>
            <a href={user.url} target="_blank" rel="noopener noreferrer">
              Ver Perfil
            </a>
            <h3>Repositórios ({user.repositories.length}):</h3>
            <ul>
              {user.repositories.map((repo) => (
                <li key={repo.url}>
                  <a href={repo.url} target="_blank" rel="noopener noreferrer">
                    {repo.name}
                  </a>{" "}
                  — ⭐ {repo.stargazerCount} | 🍴 {repo.forkCount}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
