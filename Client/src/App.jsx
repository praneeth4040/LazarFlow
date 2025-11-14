import React, { useState, useEffect } from 'react'
import './App.css'
import axios from 'axios'

function App() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/teams')
      setTeams(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch teams')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container"><p>Loading...</p></div>
  if (error) return <div className="container"><p className="error">{error}</p></div>

  return (
    <div className="container">
      <h1>Esports Points Table Maker</h1>
      <div className="table-wrapper">
        <table className="points-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Points</th>
              <th>Wins</th>
              <th>Losses</th>
            </tr>
          </thead>
          <tbody>
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <tr key={team.id}>
                  <td>{index + 1}</td>
                  <td>{team.name}</td>
                  <td>{team.points}</td>
                  <td>{team.wins}</td>
                  <td>{team.losses}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">No teams available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
