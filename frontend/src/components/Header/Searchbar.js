import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Searchbar.css"; // Import the CSS file

function Searchbar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/posts/search?text=${value}`);
        const results = await response.json();
        setSuggestions(results);
      } catch (error) {
        console.error("Error fetching search results:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = ({username,url_title}) => {
    
    navigate(`devlog/${username}/${url_title}`);
    setQuery("");
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <form id="search" onSubmit={handleSubmit}>
      
      <input
        name="query"
        id="input"
        type="text"
        placeholder="Search..."
        value={query}
        onChange={handleInputChange}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion) => (
            <li key={suggestion._id} onClick={() => handleSuggestionClick({username:suggestion.user.username,url_title:suggestion.url_title})}>
              {suggestion.subtitle}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export default Searchbar;
