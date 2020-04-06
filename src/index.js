import $ from "jquery";
import { concat, defer, from, fromEvent, merge, Subject, zip } from "rxjs";
import { ajax } from "rxjs/ajax";
import {
  filter,
  mapTo,
  mergeMap,
  mergeMapTo,
  pluck,
  switchMap
} from "rxjs/operators";
import "./styles.css";

/**
 * Recommendation Cards
 * ====================
 * - data are loaded lazily
 */

let page = 1;
const pokemonList$ = defer(() => {
  console.log(`Making call to get pokemons`);
  // this API get 20 pokemons
  return ajax.getJSON(
    `https://pokemon-json.herokuapp.com/api/pokedex?_limit=20&_page=${page++}`
  );
}).pipe(switchMap(pokemons => from(pokemons)));

const cardIds = Array.from(document.querySelectorAll('[id^="card"]')).map(
  el => el.id
);

const cards$ = from(cardIds);

const dismissEvent$ = cards$.pipe(
  mergeMap(cardId =>
    fromEvent(document.getElementById(cardId), "click").pipe(
      pluck("target", "className"),
      filter(cx => cx.indexOf("dismiss") > -1),
      mapTo(cardId)
    )
  )
);

const refreshEvent$ = fromEvent(
  document.querySelector(".refresh"),
  "click"
).pipe(mergeMapTo(cards$));

const dismissOrRefreshSub = new Subject();

merge(dismissEvent$, refreshEvent$).subscribe(dismissOrRefreshSub);

const loadNewPokemons$ = zip(pokemonList$, dismissOrRefreshSub);

const infiniteLoadNewPokemon$ = defer(() => {
  return concat(loadNewPokemons$, infiniteLoadNewPokemon$);
});

const loadNewPokemonOnload$ = zip(
  pokemonList$,
  merge(dismissOrRefreshSub, cards$)
);

concat(loadNewPokemonOnload$, infiniteLoadNewPokemon$).subscribe(
  ([pokemon, cardId]) => {
    $(`#${cardId}`).html(`
      <div>${pokemon.name.english} #${pokemon.id}
        <div>
          <img src="${pokemon.thumbnail}" alt="" width="50" height="50" />
        </div>
        <div>
          <button type="button" class="dismiss">X</button>
        </div>
    </div>`);
  }
);
