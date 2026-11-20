# Half-Range Fourier Explorer

An interactive browser application for studying half-range Fourier sine and
cosine series, approximation error, Gibbs oscillations, and one-dimensional
heat conduction.

The project begins with the capstone example

```math
f(x) = x^2, \qquad 0 < x < \pi
```

and makes the mathematics visible through live graphs, error measurements, a
heat-conduction laboratory, and a daily-life hot-pan countertop scenario.

## Features

- **Project overview** explaining even and odd half-range extensions
- **Fourier Explorer** comparing sine and cosine partial sums
- **N-term slider** for using 1 to 50 Fourier modes
- **Error analysis** with RMSE, maximum error, and error-by-position plots
- **Heat Conduction Lab** with fixed-temperature and insulated boundaries
- **Material comparison** for wood, granite, and steel
- **Daily-life scenario** showing heat from a pan spreading through a countertop
- Responsive layouts for desktop, tablet, and mobile screens

## Technology

The application is intentionally lightweight and buildless:

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas-based charts
- Browser-local numerical calculations

It requires no database, backend server, package installation, or JavaScript
build tool. Python is used only to serve the static files locally.

## Project structure

```text
Applied_capstone_project/
├── dist/
│   ├── index.html      # Application pages and interface
│   ├── app.js          # Fourier calculations, charts, and simulations
│   └── styles.css      # Responsive visual design
├── .gitignore
└── README.md
```

## Quick start

### Requirements

Install one of the following:

- Python 3, recommended
- Any static HTTP server

No Python libraries are required.

### 1. Clone the project

```bash
git clone https://github.com/suryakathyakeyaboddi-creator/Applied_capstone_project.git
cd Applied_capstone_project
```

If the project already exists in your Downloads folder:

```bash
cd ~/Downloads/Applied_cap_pro
```

### 2. Start the local server

On macOS or Linux:

```bash
python3 -m http.server 4173 --directory dist
```

On Windows, if `python3` is unavailable:

```powershell
py -m http.server 4173 --directory dist
```

### 3. Open the application

Visit:

```text
http://localhost:4173
```

### 4. Stop the server

Return to the terminal and press:

```text
Ctrl + C
```

## How to use the application

### Fourier Explorer

1. Open **Explorer** from the navigation bar.
2. Move the **Number of terms, N** slider.
3. Select **Compare**, **Cosine**, or **Sine**.
4. Observe how the approximation changes.
5. Compare RMSE and maximum error.
6. Inspect the positional-error and RMSE-versus-N graphs.

The cosine approximation converges faster for this example because the even
periodic extension is continuous. The odd extension creates a jump at the
period boundary, producing slower coefficient decay and Gibbs oscillations.

### Heat Conduction Lab

1. Open **Heat lab**.
2. Select wood, granite, or steel.
3. Choose cooled or insulated ends.
4. Select the number of Fourier modes.
5. Move the time slider or press **Play**.

The faded dashed curve shows the initial temperature profile. The coloured
curve and heat strip show its evolution over time.

### Daily-life scenario

1. Open **Daily life**.
2. Select a countertop material.
3. Change the pan position.
4. Change the number of modes and elapsed time.
5. Compare cooled ends with insulated edge covers.

The temperature colour map and graph are generated from the same Fourier heat
model used in the Heat Lab.

## Mathematical model

### Half-range cosine series

The even extension of \(x^2\) gives

```math
x^2 = \frac{\pi^2}{3} + 4\sum_{n=1}^{\infty}\frac{(-1)^n}{n^2}\cos(nx).
```

The N-term approximation is

```math
S_N^{\cos}(x)=\frac{\pi^2}{3} + 4\sum_{n=1}^{N}\frac{(-1)^n}{n^2}\cos(nx).
```

### Half-range sine series

The odd extension gives

```math
S_N^{\sin}(x)=\sum_{n=1}^{N}b_n\sin(nx),
```

where

```math
b_n=\frac{2\pi(-1)^{n+1}}{n} +\frac{4\left((-1)^n-1\right)}{\pi n^3}.
```

Every finite sine sum satisfies `S_N^{sin}(π) = 0`, while
`f(π) = π²`. This explains the persistent endpoint error.

### Error measurements

For sampled positions `x_i`, the application calculates

```math
\mathrm{RMSE}=\sqrt{\frac{1}{M}\sum_{i=1}^{M}\left(f(x_i)-S_N(x_i)\right)^2}
```

and

```math
E_{\max}=\max_i\left|f(x_i)-S_N(x_i)\right|.
```

### Heat equation

The simulation uses the one-dimensional heat equation

```math
\frac{\partial T}{\partial t}=\alpha\frac{\partial^2T}{\partial x^2}.
```

For fixed-temperature ends, it uses sine modes. For insulated ends, it uses
cosine modes. Each mode decays through

```math
e^{-\alpha(n\pi/L)^2t}.
```

Higher-frequency modes decay faster, so sharp temperature variations become
smoother over time.

## Verified reference values

The application reproduces the capstone's 4,001-point RMSE calculations:

| N | Cosine RMSE | Sine RMSE |
|---:|---:|---:|
| 1 | 0.8120 | 3.5369 |
| 3 | 0.2449 | 2.3614 |
| 5 | 0.1258 | 1.8918 |
| 10 | 0.0481 | 1.3739 |
| 20 | 0.0177 | 0.9871 |
| 50 | 0.0046 | 0.6348 |

## Development

Edit the files in `dist/` directly and refresh the browser after saving.

Check the JavaScript syntax with:

```bash
node --check dist/app.js
```

To use another port:

```bash
python3 -m http.server 8080 --directory dist
```

Then open `http://localhost:8080`.

## Troubleshooting

### `python3: command not found`

Install Python 3 or use the Windows `py` command shown above.

### Port already in use

Choose another port, such as 8080:

```bash
python3 -m http.server 8080 --directory dist
```

### The page opens without styling or interactions

Run the server from the project root and keep the `dist` directory unchanged.
Confirm that `index.html`, `styles.css`, and `app.js` are all inside `dist/`.

### The browser shows an old version

Perform a hard refresh:

- macOS: `Command + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

## Scope and limitations

- The heat simulation is one-dimensional.
- Material diffusivity values are representative educational values.
- Air convection and thermal radiation are not included.
- Maximum error is evaluated on a finite numerical grid.
- The application is intended for teaching and demonstration, not industrial
  thermal engineering.

## Academic context

This project demonstrates that the quality of a Fourier approximation depends
on both the number of retained terms and the regularity of the selected
periodic extension. It also shows how physical boundary conditions determine
whether sine or cosine modes are appropriate in a heat-conduction problem.
