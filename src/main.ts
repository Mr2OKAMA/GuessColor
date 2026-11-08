import './style.css'
import pokemons from './data/pokemon.json'
import { mountApp } from './ui/app'

mountApp(document.getElementById('app')!, pokemons)
