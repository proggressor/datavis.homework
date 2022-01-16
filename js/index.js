const width = 1000;
const barWidth = 500;
const height = 500;
const margin = 30;

const yearLabel = d3.select('#year');
const countryName = d3.select('#country-name');

const barChart = d3.select('#bar-chart')
    .attr('width', barWidth)
    .attr('height', height);

const scatterPlot = d3.select('#scatter-plot')
    .attr('width', width)
    .attr('height', height);

const lineChart = d3.select('#line-chart')
    .attr('width', width)
    .attr('height', height);

let xParam = 'fertility-rate';
let yParam = 'child-mortality';
let rParam = 'gdp';
let year = '2000';
let param = 'child-mortality';
let lineParam = 'gdp';
let highlighted = null;
let selected = null;

const x = d3.scaleLinear().range([margin * 2, width - margin]);
const y = d3.scaleLinear().range([height - margin, margin]);

const xBar = d3.scaleBand().range([margin * 2, barWidth - margin]).padding(0.1);
const yBar = d3.scaleLinear().range([height - margin, margin])

const xAxis = scatterPlot.append('g').attr('transform', `translate(0, ${height - margin})`);
const yAxis = scatterPlot.append('g').attr('transform', `translate(${margin * 2}, 0)`);

const xLineAxis = lineChart.append('g').attr('transform', `translate(0, ${height - margin})`);
const yLineAxis = lineChart.append('g').attr('transform', `translate(${margin * 2}, 0)`);

const xBarAxis = barChart.append('g').attr('transform', `translate(0, ${height - margin})`);
const yBarAxis = barChart.append('g').attr('transform', `translate(${margin * 2}, 0)`);

const colorScale = d3.scaleOrdinal().range(['#DD4949', '#39CDA1', '#FD710C', '#A14BE5']);
const radiusScale = d3.scaleSqrt().range([10, 30]);

loadData().then(data => {

    colorScale.domain(d3.set(data.map(d => d.region)).values());

    d3.select('#range').on('change', function () { 
        year = d3.select(this).property('value');
        yearLabel.html(year);
        updateScatterPlot();
        updateBar();
    });

    d3.select('#radius').on('change', function () { 
        rParam = d3.select(this).property('value');
        updateScatterPlot();
    });

    d3.select('#x').on('change', function () { 
        xParam = d3.select(this).property('value');
        updateScatterPlot();
    });

    d3.select('#y').on('change', function () { 
        yParam = d3.select(this).property('value');
        updateScatterPlot();
    });

    d3.select('#param').on('change', function () { 
        param = d3.select(this).property('value');
        updateBar();
    });

    function updateScatterPlot() {
        let xs = data.map(el => Number(el[xParam][year]));
        x.domain([d3.min(xs), d3.max(xs)]);
        xAxis.call(d3.axisBottom(x));

        let ys = data.map(d => Number(d[yParam][year]));
        y.domain([d3.min(ys), d3.max(ys)]);
        yAxis.call(d3.axisLeft(y));

        let rs = data.map(el => Number(el[rParam][year]));
        radiusScale.domain([d3.min(rs), d3.max(rs)]);

        function setParams(obj) {
            return obj.attr('cx', el => x(el[xParam][year]))
                .attr('cy', el => y(el[yParam][year]))
                .attr('region', el => (el.region))
                .attr('fill', el => colorScale(el.region))
                .attr('r', el => radiusScale(el[rParam][year]))
        }

        let circles = scatterPlot.selectAll('circle').data(data);
        circles = setParams(circles).enter().append('circle');
        circles = setParams(circles).on("click", function (el) {
            selected = el.country;
            countryName.text(selected);
            circles.attr('stroke', 1).attr('stroke-width', 1);
            d3.select(this).raise().attr('stroke-width', 2);
            updateLine()
        })
    }

    function updateLine() {
        filtered = data.filter(el => el.country == selected)[0];
        params = filtered[lineParam];
        xs = Object.keys(params).map(Number).filter(el => el > 0);
        ys = xs.map(el => Number(params[el]));
        line_data = xs.map(el => ({
            'year': el,
            'value': Number(params[el])
        }));

        x.domain([d3.min(xs), d3.max(xs)]);
        xLineAxis.call(d3.axisBottom(x));
        y.domain([d3.min(ys), d3.max(ys)]);
        yLineAxis.call(d3.axisLeft(y));

        line = d3.line()
            .x(el => x(el.year))
            .y(el => y(el.value));

        d3.selectAll('#lines').attr("display", "none");

        lineChart.append("path")
            .datum(line_data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line)
            .attr("id", "lines");
    }

    function updateBar() {
        regions_names = d3.map(data, el => el["region"]).keys();
        regions_means = regions_names.map(
            regname => ({
                'region': regname,
                'mean': d3.mean(data.filter(el => el['region'] == regname).map(el => el[param][year]))
            })
        );

        xBar.domain(regions_names);
        xBarAxis.call(d3.axisBottom(xBar));

        yBar.domain([0, d3.max(regions_means.map(el => el["mean"]))]);
        yBarAxis.call(d3.axisLeft(yBar));

        function setParams(obj) {
            return obj.attr('width', 80)
                .attr('height', el => yBar(0) - yBar(el['mean']))
                .attr('x', el => xBar(el['region']))
                .attr('y', el => yBar(el['mean']))
                .attr('fill', el => colorScale(el['region']))
        }

        rects = setParams(barChart.selectAll('rect').data(regions_means));
        rects = setParams(rects.enter().append('rect'));
        circles = scatterPlot.selectAll('circle');
        highlighted = null;
        rects.on("click", function (el) {
            if (highlighted != this) {
                rects.attr('opacity', 0.5);
                d3.select(this).attr('opacity', 1);
                circles.style('visibility', 'hidden');
                circles.filter(c => c['region'] == el.region).style('visibility', 'visible');
                highlighted = this;
            } else {
                rects.attr('opacity', 1);
                circles.style('visibility', 'visible');
                highlighted = null;
            }
        })
    }

    updateBar();
    updateScatterPlot();
});


async function loadData() {
    const data = { 
        'population': await d3.csv('data/population.csv'),
        'gdp': await d3.csv('data/gdp.csv'),
        'child-mortality': await d3.csv('data/cmu5.csv'),
        'life-expectancy': await d3.csv('data/life_expectancy.csv'),
        'fertility-rate': await d3.csv('data/fertility-rate.csv')
    };
    
    return data.population.map(d => {
        const index = data.gdp.findIndex(item => item.geo == d.geo);
        return {
            country: d.country,
            geo: d.geo,
            region: d.region,
            population: d,
            'gdp': data['gdp'][index],
            'child-mortality': data['child-mortality'][index],
            'life-expectancy': data['life-expectancy'][index],
            'fertility-rate': data['fertility-rate'][index]
        }
    })
}