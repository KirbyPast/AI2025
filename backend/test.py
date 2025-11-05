
from queue import Queue, PriorityQueue
import collections
import time
import math
import random


from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)



class NQueensPartialState:
    def __init__(self, state_tuple, n):
        self.state = state_tuple
        self.n = n
        self.current_row = len(self.state)

    def is_goal(self):
        return self.current_row == self.n

    def _is_valid_move(self, col_to_add):
        for r, c in enumerate(self.state):
            if c == col_to_add: return False
            if abs(self.current_row - r) == abs(col_to_add - c): return False
        return True

    def get_successors(self):
        if self.is_goal(): return []
        successors = []
        for col in range(self.n):
            if self._is_valid_move(col):
                new_state_tuple = self.state + (col,)
                successors.append(NQueensPartialState(new_state_tuple, self.n))
        return successors

    def cost_g(self):
        return len(self.state)

    def heuristic_h(self):
        return 0

    def heuristic_greedy(self):
        return self.n - len(self.state)

    def __hash__(self):
        return hash(self.state)

    def __eq__(self, other):
        return isinstance(other, NQueensPartialState) and self.state == other.state

    def __lt__(self, other):
        return hash(self.state) < hash(other.state)

    def __str__(self):
        return f"State{self.state}"


# --- ALGORITMII (din scriptul dvs.) ---
def run_bfs(n):
    init_state = NQueensPartialState((), n) 
    q = Queue() 
    q.put(init_state) 
    viz = {init_state}
    while not q.empty():
        state = q.get()
        if state.is_goal(): return state.state
        for neigh in state.get_successors():
            if neigh not in viz: viz.add(neigh);  q.put(neigh)
    return None


def run_dfs(n):
    init_state = NQueensPartialState((), n) 
    s = [] 
    s.append(init_state) 
    viz = {init_state}
    while s:
        state = s.pop()
        if state.is_goal(): return state.state
        for neigh in reversed(state.get_successors()):
            if neigh not in viz: viz.add(neigh);  s.append(neigh)
    return None


def run_ucs(n):
    init_state = NQueensPartialState((), n) 
    d = {} 
    d[init_state] = 0 
    pq = PriorityQueue() 
    pq.put((d[init_state], init_state)) 
    viz = {}
    while not pq.empty():
        cost, state = pq.get()
        if state in viz and viz[state] < cost: continue
        viz[state] = cost
        if state.is_goal(): return state.state
        for neighbor in state.get_successors():
            new_cost = state.cost_g() + 1
            if neighbor not in viz and neighbor not in d:
                d[neighbor] = new_cost; pq.put((new_cost, neighbor))
            elif neighbor in d and new_cost < d[neighbor]:
                d[neighbor] = new_cost;  pq.put((new_cost, neighbor))
    return None


def run_iddfs(n, max_depth=10):
    init_state = NQueensPartialState((), n)
    for depth in range(max_depth + 1):
        visited = {}

        def depth_limited_dfs(state, limit, viz):
            if state.is_goal(): return state.state
            if limit == 0: return None
            viz[state] = True
            for neigh in state.get_successors():
                if neigh not in viz:
                    sol = depth_limited_dfs(neigh, limit - 1, viz)
                    if sol is not None: return sol
            return None

        sol = depth_limited_dfs(init_state, depth, visited)
        if sol is not None: return sol
    return None


def run_bkt(n):
    init_state = NQueensPartialState((), n)

    def bkt_recursive(partial_solution):
        if partial_solution.is_goal(): return partial_solution.state
        for solution in partial_solution.get_successors():
            res = bkt_recursive(solution)
            if res: return res
        return None

    return bkt_recursive(init_state)


def run_greedy(n):
    init_state = NQueensPartialState((), n) 
    pq = PriorityQueue() 
    pq.put((init_state.heuristic_greedy(), init_state)) 
    viz = {init_state}
    while not pq.empty():
        h_val, state = pq.get()
        if state.is_goal(): return state.state
        for neighbor in state.get_successors():
            if neighbor not in viz: viz.add(neighbor);  pq.put((neighbor.heuristic_greedy(), neighbor))
    return None


def run_astar(n):
    init_state = NQueensPartialState((), n) 
    d = {} 
    f = {} 
    d[init_state] = 0 
    f[init_state] = init_state.heuristic_h() 
    pq = PriorityQueue() 
    pq.put((f[init_state], init_state)) 
    came_from = {}
    while not pq.empty():
        f_val, state = pq.get()
        if state.is_goal(): return state.state
        for neighbor in state.get_successors():
            tentative_d = d[state] + 1
            if neighbor not in d or tentative_d < d[neighbor]:
                d[neighbor] = tentative_d 
                f[neighbor] = tentative_d + neighbor.heuristic_h() 
                came_from[neighbor] = state 
                pq.put((f[neighbor], neighbor))
    return None


def run_beam(n, k=10):
    init_state = NQueensPartialState((), n) 
    beam = PriorityQueue() 
    beam.put((init_state.heuristic_greedy(), init_state)) 
    viz = {init_state}
    while not beam.empty():
        best_h, best_state = beam.queue[0]
        if best_state.is_goal(): return best_state.state
        new_beam_candidates = []
        while not beam.empty():
            h_val, state = beam.get()
            for neighbor in state.get_successors():
                if neighbor not in viz: viz.add(neighbor);  new_beam_candidates.append(
                    (neighbor.heuristic_greedy(), neighbor))
        new_beam_candidates.sort(key=lambda x: x[0]) 
        new_beam_list = new_beam_candidates[:k] 
        beam = PriorityQueue()
        for h, s in new_beam_list: beam.put((h, s))
    return None


@app.route('/api/run-benchmark', methods=['GET'])
def run_benchmark():


    n_queens = random.randint(2, 11)

    solvers = {
        "BFS": run_bfs,
        "DFS": run_dfs,
        "UCS": run_ucs,
        "BKT": run_bkt,
        "IDDFS": lambda n: run_iddfs(n, max_depth=n),
        "Greedy": run_greedy,
        "A*": run_astar,
        "Beam": lambda n: run_beam(n, k=20)
    }

    print(f"--- Începe rularea (SECENȚIALĂ) pentru N = {n_queens} ---")

    results_list = []

    for name, func in solvers.items():
        print(f"\n[Rulare] {name}...")

        result_entry = {
            "name": name,
            "solution": "N/A",
            "duration_sec": float('inf'),  # Timp numeric (infinit în caz de eroare)
            "duration_str": "EROARE",  # Timp ca text
            "status": "EROARE"
        }

        try:
            start_time = time.perf_counter()
            solution = func(n_queens)
            end_time = time.perf_counter()
            duration = end_time - start_time

            result_entry["duration_sec"] = duration
            result_entry["duration_str"] = f"{duration:.6f}s"
            result_entry["solution"] = str(solution) if solution is not None else "None"
            result_entry["status"] = "Găsit" if solution is not None else "Finalizat (Fără Soluție)"

            print(f"  -> Soluție: {result_entry['solution']}")
            print(f"  -> Timp: {result_entry['duration_str']}")

        except Exception as e:
            print(f"  -> EROARE: {e}")
            result_entry["solution"] = str(e)
            # duration_sec și duration_str sunt deja setate la EROARE/infinit

        results_list.append(result_entry)

    print(f"--- Rulare terminată pentru N = {n_queens} ---")

    response_data = {
        "n_queens": n_queens,
        "results": results_list
    }

    return jsonify(response_data)


if __name__ == "__main__":
    print("Pornire server Flask la http://localhost:5000")
    app.run(debug=True, port=5000)