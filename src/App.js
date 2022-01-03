import React from "react";
import "./styles.css";

const ROWS = 10;
const COLS = 20;
const PIXEL = 20;
const moveRight = ([t, l]) => [t, (l + 1) % COLS];
const moveLeft = ([t, l]) => [t, (l - 1 + COLS) % COLS];
const moveUp = ([t, l]) => [(t - 1 + ROWS) % ROWS, l];
const moveDown = ([t, l]) => [(t + 1) % ROWS, l];

const directionMap = {
  R: moveRight,
  L: moveLeft,
  U: moveUp,
  D: moveDown
};

function toKey([top, left]) {
  return top + "_" + left;
}
// Hook
function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };
  return [storedValue, React.useCallback(setValue, [key, storedValue])];
}

//TODO highscore in local storage
// Différents niveaux de jeu (obstacle)
// dark mode
const Cell = React.memo(({ top, left, active, hasFood }) => {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: PIXEL,
        height: PIXEL,
        background: active ? "green" : ""
      }}
    >
      {hasFood && <em>🍒</em>}
    </div>
  );
});

const initialSnake = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3]
];

function Board() {
  const [highscore, setHighscore] = useLocalStorage("snake_highscore", 0);
  const [snakeState, setSnakeState] = React.useState({
    snake: initialSnake,
    dir: ["R"],
    food: toKey([Math.floor(ROWS / 2), Math.floor(COLS / 2)])
  });
  const ref = React.useRef(null);
  const { dir, snake, food } = snakeState;

  function initializeCanvas() {
    const snakeSet = new Set();
    for (const coord of snake) {
      snakeSet.add(toKey(coord));
    }
    const grid = [];
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        grid.push(
          <Cell
            active={snakeSet.has(toKey([i, j]))}
            hasFood={toKey([i, j]) === food}
            key={toKey([i, j])}
            top={i * PIXEL}
            left={j * PIXEL}
          />
        );
      }
    }
    return grid;
  }

  React.useEffect(() => {
    function spawnFood(sn) {
      const vacant = new Set();
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
          vacant.add(toKey([i, j]));
        }
      }

      for (const coord of sn) {
        vacant.delete(toKey(coord));
      }

      const choice = Math.floor(Math.random() * vacant.size);
      let i = 0;
      for (const key of vacant) {
        if (i === choice) {
          return key;
        }
        i++;
      }
    }

    const id = setInterval(() => {
      setSnakeState((prevState) => {
        if (prevState.isLost) {
          return {
            ...prevState
          };
        }
        let sn = [...prevState.snake];
        let newFood = prevState.food;
        let newDir = prevState.dir[0];
        let newDirQueue =
          prevState.dir.length > 1 ? prevState.dir.slice(1) : prevState.dir;
        if (newDir === "STOP" || !newDirQueue)
          return {
            ...prevState,
            dir: newDirQueue
          };

        sn.shift();
        let head = sn[sn.length - 1];
        let mvFunction = directionMap[newDir];
        let newHead = mvFunction(head);
        sn.push(newHead);
        const snakeSet = new Set();
        const rest = sn.slice(0, -1);
        for (const coord of rest) {
          snakeSet.add(toKey(coord));
        }
        if (snakeSet.has(toKey(newHead))) {
          const score = sn.length - initialSnake.length;
          if (score > highscore) {
            setHighscore(score);
          }
          return {
            ...prevState,
            snake: initialSnake,
            dir: ["STOP"],
            food: spawnFood(initialSnake)
          };
        } else if (toKey(newHead) === newFood) {
          sn = [...sn, mvFunction(newHead)];
          newFood = spawnFood(sn);
        }

        return {
          ...prevState,
          food: newFood,
          snake: sn,
          dir: newDirQueue
        };
      });
    }, 80);

    return () => {
      clearInterval(id);
    };
  }, [highscore, setHighscore]);

  function areOpposite(dir1, dir2) {
    if (dir1 === "L" && dir2 === "ArrowRight") {
      return true;
    }
    if (dir1 === "R" && dir2 === "ArrowLeft") {
      return true;
    }
    if (dir1 === "U" && dir2 === "ArrowDown") {
      return true;
    }
    if (dir1 === "D" && dir2 === "ArrowUp") {
      return true;
    }
    return false;
  }

  const handleKeyDown = (e) => {
    e.preventDefault();
    if (
      e.shiftKey ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      areOpposite(dir[dir.length - 1], e.key)
    ) {
      return;
    }
    switch (e.key) {
      case "ArrowLeft":
        if (dir !== "L")
          setSnakeState((prevState) => ({
            ...prevState,
            dir: [...prevState.dir, "L"]
          }));
        break;
      case "ArrowRight":
        if (dir !== "R")
          setSnakeState((prevState) => ({
            ...prevState,
            dir: [...prevState.dir, "R"]
          }));
        break;
      case "ArrowUp":
        if (dir !== "U")
          setSnakeState((prevState) => ({
            ...prevState,
            dir: [...prevState.dir, "U"]
          }));
        break;
      case "ArrowDown":
        if (dir !== "D")
          setSnakeState((prevState) => ({
            ...prevState,
            dir: [...prevState.dir, "D"]
          }));
        break;
      case "S":
      case "s":
      case " ":
        setSnakeState((prevState) => ({
          ...prevState,
          dir: [...prevState.dir, "STOP"]
        }));
        break;
      default:
        break;
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}
      tabIndex={0}
      ref={ref}
      onKeyDown={handleKeyDown}
    >
      <div id="canvas">{initializeCanvas().map((c) => c)}</div>
      <h3>Score: {snake.length - initialSnake.length}</h3>
      <h3>Highscore: {highscore}</h3>
    </div>
  );
}

function Snake() {
  return <Board />;
}

export default Snake;
