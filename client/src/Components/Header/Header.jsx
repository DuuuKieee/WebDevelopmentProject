import React, {useState} from "react";
import "./Header.scss";
import Banner from "../../Assets/Banner.gif";
import SearchBar from "./SearchBar/SearchBar";

const Header = () => {
    const [results, setResults] = useState([]);
    return (
        <div className="top grid">
            <div className="Header flex">
                <div className="Title grid">
                    <h1>Welcome to our Game Web!</h1>
                    <h3>PLease enjoy your moment~</h3>
                </div>

                <SearchBar setResults={setResults}/>
            </div>

            <div className="TitleImg">
                <img src={Banner}></img>
            </div>
        </div>
    )
}

export default Header