const CHROMOSOME_LENGTH = 10;
const POPULATION_SIZE = 6;

// Estado da Máquina
let phase = 'INIT'; // Fases: INIT, SELECTION, CROSSOVER, MUTATION, READY_NEXT
let step = 0;
let generation = 0;

// Dados
let population = [];
let parents = [];
let children = [];

// Variáveis temporárias para cada passo
let currentChromosome = "";
let comp1 = null;
let comp2 = null;
let winner = null;
let cutPoint = 0;
let mutRoll = 0;
let mutPos = 0;

const iArea = document.getElementById('interactive-area');
const phaseTitle = document.getElementById('phase-title');
const phaseProgress = document.getElementById('phase-progress');

// Funções Auxiliares (Simuladores físicos)
function rollDice(sides = 6) { return Math.floor(Math.random() * sides) + 1; }
function flipCoin() { return Math.random() < 0.5 ? '1' : '0'; }
function getFitness(chrom) { return chrom.split('').filter(c => c === '1').length; }

function updateOverview() {
    document.getElementById('gen-counter').textContent = generation;
    const tBody = document.getElementById('population-body');
    tBody.innerHTML = '';
    
    let totalFit = 0;
    let bestFit = -1;
    let validCount = 0;

    for(let i=0; i < POPULATION_SIZE; i++) {
        let ind = population[i];
        let fit = ind ? ind.fitness : '-';
        let chrom = ind ? ind.chromosome : '- - - - - - - - - -';
        
        if (ind) {
            totalFit += ind.fitness;
            validCount++;
            if(ind.fitness > bestFit) bestFit = ind.fitness;
        }
        
        tBody.innerHTML += `<tr>
            <td>${i+1}</td>
            <td class="mono">${chrom}</td>
            <td><b>${fit}</b></td>
        </tr>`;
    }
    
    document.getElementById('avg-fitness').textContent = validCount > 0 ? (totalFit / validCount).toFixed(2) : '0.00';
    document.getElementById('best-fitness').textContent = bestFit >= 0 ? bestFit : '0';

    const pPoolContainer = document.getElementById('parents-pool-container');
    const pPool = document.getElementById('parents-pool');
    
    if(parents.length > 0) {
        pPoolContainer.style.display = 'block';
        pPool.innerHTML = parents.map(p => `<span class="parent-badge">Pai Ind. ${p.id} (Apt: ${p.fitness})</span>`).join('');
    } else {
        pPoolContainer.style.display = 'none';
        pPool.innerHTML = '';
    }
}

function render() {
    updateOverview();
    if (phase === 'INIT') renderInit();
    else if (phase === 'SELECTION') renderSelection();
    else if (phase === 'CROSSOVER') renderCrossover();
    else if (phase === 'MUTATION') renderMutation();
    else if (phase === 'READY_NEXT') renderReadyNext();
}

// ==========================================
// FASE 1: GERAÇÃO INICIAL
// ==========================================
function renderInit() {
    phaseTitle.textContent = "1. População Inicial";
    phaseProgress.textContent = `Indivíduo ${step + 1} de ${POPULATION_SIZE}`;
    
    let html = `
        <div class="theory-box">
            <strong>💡 Teoria: População Inicial</strong><br>
            Em Algoritmos Genéticos, começamos com um conjunto aleatório de possíveis soluções (indivíduos). Cada bit (0 ou 1) representa um "gene", e a sequência completa é o "cromossomo". A "aptidão" (fitness) avalia quão boa é a solução; no nosso caso, quanto mais genes '1', melhor adaptado está o indivíduo.
        </div>
        <h3 style="color:#555; margin-bottom: 5px;">Gere os bits para o Indivíduo ${step + 1}</h3>
        <p style="color:#777; margin-top:0;">(Lance a moeda para preencher os 10 bits)</p>
        
        <div class="chromosome-builder">
            ${currentChromosome.split('').map(b => `<span class="bit-box bit-${b}">${b}</span>`).join('')}
            ${`<span style="color:#bdc3c7;">_</span>`.repeat(CHROMOSOME_LENGTH - currentChromosome.length).split('').join(' ')}
        </div>
        
        <p style="font-size: 18px;">Aptidão atual: <b>${getFitness(currentChromosome)}</b> (Contagem de 1s)</p>
        
        <div style="margin-top:30px;">
    `;
    
    if (currentChromosome.length < CHROMOSOME_LENGTH) {
        html += `<button id="btn-coin" class="action-btn">🪙 Jogar 1 Moeda</button>`;
        html += `<button id="btn-coin-all" class="action-btn secondary">⚡ Jogar Restante Automaticamente</button>`;
    } else {
        html += `<button id="btn-next-ind" class="action-btn success">Registrar Indivíduo</button>`;
    }
    
    html += `</div>`;
    iArea.innerHTML = html;

    // Listeners
    if (document.getElementById('btn-coin')) {
        document.getElementById('btn-coin').onclick = () => { currentChromosome += flipCoin(); render(); };
    }
    if (document.getElementById('btn-coin-all')) {
        document.getElementById('btn-coin-all').onclick = () => {
            while(currentChromosome.length < CHROMOSOME_LENGTH) currentChromosome += flipCoin();
            render();
        };
    }
    if (document.getElementById('btn-next-ind')) {
        document.getElementById('btn-next-ind').onclick = () => {
            population.push({ id: step + 1, chromosome: currentChromosome, fitness: getFitness(currentChromosome) });
            currentChromosome = "";
            step++;
            if (step >= POPULATION_SIZE) { phase = 'SELECTION'; step = 0; }
            render();
        };
    }
}

// ==========================================
// FASE 2: SELEÇÃO
// ==========================================
function renderSelection() {
    phaseTitle.textContent = "2. Seleção (Torneio de 2)";
    phaseProgress.textContent = `Torneio ${step + 1} de ${POPULATION_SIZE}`;

    let html = `
        <div class="theory-box">
            <strong>💡 Teoria: Seleção por Torneio</strong><br>
            Assim como na natureza, os mais aptos têm maior chance de sobreviver e reproduzir. No método de "Torneio", sorteamos aleatoriamente competidores e o que tiver maior aptidão vence a vaga de pai. Isso favorece os melhores, mas dá uma pequena chance aos mais fracos de serem selecionados (se sorteados contra alguém pior), mantendo a diversidade genética.
        </div>
        <p style="font-size:16px;">Sorteie dois indivíduos no dado para batalhar por uma vaga na piscina de pais.</p>
        <div class="tournament">
            <div class="competitor" id="box-c1" style="${winner === comp1 && winner != null ? 'border-color: #2ecc71; background-color: #eafaf1;' : ''}">
                <h4>Competidor 1</h4>
                ${comp1 
                    ? `<div class="dice-result">🎲 Ind. ${comp1.id}</div><p style="font-family:monospace;font-size:16px">${comp1.chromosome}</p><p style="font-size:18px">Aptidão: <b>${comp1.fitness}</b></p>` 
                    : `<button id="btn-roll-c1" class="action-btn">Rolar Dado (1 a 6)</button>`}
            </div>
            <div class="competitor" id="box-c2" style="${winner === comp2 && winner != null ? 'border-color: #2ecc71; background-color: #eafaf1;' : ''}">
                <h4>Competidor 2</h4>
                ${comp2 
                    ? `<div class="dice-result">🎲 Ind. ${comp2.id}</div><p style="font-family:monospace;font-size:16px">${comp2.chromosome}</p><p style="font-size:18px">Aptidão: <b>${comp2.fitness}</b></p>` 
                    : (comp1 ? `<button id="btn-roll-c2" class="action-btn">Rolar Dado (1 a 6)</button>` : `<p style="color:#999; margin-top:40px;">Aguardando Competidor 1...</p>`)}
            </div>
        </div>
        <div id="tournament-result" class="result-box"></div>
    `;

    if (comp1 && comp2) {
        if (comp1.id === comp2.id) {
             html += `<p style="color:#e74c3c; font-weight:bold;">Sorteado o mesmo indivíduo!</p>
                      <button id="btn-reroll" class="action-btn">Rolar Dado Novamente</button>`;
        } else {
            if (!winner) {
                if (comp1.fitness !== comp2.fitness) {
                    winner = comp1.fitness > comp2.fitness ? comp1 : comp2;
                    setTimeout(render, 10); // Atualiza imediatamente a tela mostrando o vencedor
                } else {
                    html += `<p style="font-size:18px;"><b>Empate!</b> Ambos têm aptidão ${comp1.fitness}. Jogue a moeda para decidir.</p>
                             <button id="btn-coin-tie" class="action-btn">🪙 Jogar Moeda de Desempate</button>`;
                }
            } else {
                 html += `<p style="font-size:22px; color:#27ae60;"><b>Vencedor: Indivíduo ${winner.id}!</b></p>
                          <button id="btn-save-winner" class="action-btn success">Copiar Vencedor para os Pais</button>`;
            }
        }
    }

    iArea.innerHTML = html;

    if (document.getElementById('btn-roll-c1')) document.getElementById('btn-roll-c1').onclick = () => { comp1 = population[rollDice(6)-1]; render(); };
    if (document.getElementById('btn-roll-c2')) document.getElementById('btn-roll-c2').onclick = () => { comp2 = population[rollDice(6)-1]; render(); };
    if (document.getElementById('btn-reroll')) document.getElementById('btn-reroll').onclick = () => { comp2 = null; render(); };
    if (document.getElementById('btn-coin-tie')) {
        document.getElementById('btn-coin-tie').onclick = () => { 
            let coin = flipCoin();
            winner = coin === '1' ? comp1 : comp2; 
            render(); 
        };
    }
    if (document.getElementById('btn-save-winner')) {
        document.getElementById('btn-save-winner').onclick = () => {
            parents.push({ ...winner }); 
            comp1 = null; comp2 = null; winner = null;
            step++;
            if (step >= POPULATION_SIZE) { phase = 'CROSSOVER'; step = 0; }
            render();
        };
    }
}

// ==========================================
// FASE 3: CRUZAMENTO
// ==========================================
function renderCrossover() {
    let totalPairs = POPULATION_SIZE / 2;
    phaseTitle.textContent = "3. Cruzamento";
    phaseProgress.textContent = `Par ${step + 1} de ${totalPairs}`;

    let p1 = parents[step * 2];
    let p2 = parents[step * 2 + 1];

    let html = `
        <div class="theory-box">
            <strong>💡 Teoria: Cruzamento (Crossover)</strong><br>
            A reprodução combina o material genético de dois pais. Na natureza, isso ocorre no nível cromossômico. Usamos o "cruzamento de 1 ponto": escolhemos um ponto de corte aleatório e trocamos as caudas (metades) entre os pais. A expectativa é que os filhos herdem as partes fortes de cada pai e formem soluções ainda melhores.
        </div>
        <p style="font-size:16px;">Os pais irão trocar suas "caudas" genéticas para gerar 2 filhos.</p>`;

    if (cutPoint === 0) {
        html += `
            <div class="crossover-view" style="color:#7f8c8d;">
                <p>Pai A (Ind. ${p1.id}): ${p1.chromosome}</p>
                <p>Pai B (Ind. ${p2.id}): ${p2.chromosome}</p>
            </div>
            <p>Role o dado para definir o <b>ponto de corte</b> (posição de 1 a 9).</p>
            <button id="btn-roll-cut" class="action-btn">Rolar Dado de Corte</button>
        `;
    } else {
        let c1 = p1.chromosome.substring(0, cutPoint) + `<span class="tail">${p2.chromosome.substring(cutPoint)}</span>`;
        let c2 = p2.chromosome.substring(0, cutPoint) + `<span class="tail">${p1.chromosome.substring(cutPoint)}</span>`;
        
        let p1_styled = p1.chromosome.substring(0, cutPoint) + `<span class="tail">${p1.chromosome.substring(cutPoint)}</span>`;
        let p2_styled = p2.chromosome.substring(0, cutPoint) + `<span class="tail">${p2.chromosome.substring(cutPoint)}</span>`;

        html += `
            <div style="display:flex; gap:20px; text-align:left;">
                <div class="crossover-view" style="flex:1;">
                    <p style="font-size:14px; font-family:sans-serif; color:#777;">PAIS (Corte: ${cutPoint})</p>
                    <p>A: ${p1_styled}</p>
                    <p>B: ${p2_styled}</p>
                </div>
                <div class="crossover-view" style="flex:1; background:#eafaf1; border-color:#2ecc71;">
                    <p style="font-size:14px; font-family:sans-serif; color:#27ae60;">NOVOS FILHOS</p>
                    <p>F1: ${c1}</p>
                    <p>F2: ${c2}</p>
                </div>
            </div>
            <button id="btn-save-children" class="action-btn success" style="margin-top:20px; padding:15px 30px;">Salvar Filhos</button>
        `;
    }

    iArea.innerHTML = html;

    if (document.getElementById('btn-roll-cut')) document.getElementById('btn-roll-cut').onclick = () => { cutPoint = rollDice(9); render(); }; 
    if (document.getElementById('btn-save-children')) {
        document.getElementById('btn-save-children').onclick = () => {
            let child1Chrom = p1.chromosome.substring(0, cutPoint) + p2.chromosome.substring(cutPoint);
            let child2Chrom = p2.chromosome.substring(0, cutPoint) + p1.chromosome.substring(cutPoint);
            children.push({ id: step*2 + 1, chromosome: child1Chrom, fitness: getFitness(child1Chrom) });
            children.push({ id: step*2 + 2, chromosome: child2Chrom, fitness: getFitness(child2Chrom) });
            cutPoint = 0; step++;
            if (step >= totalPairs) { phase = 'MUTATION'; step = 0; }
            render();
        };
    }
}

// ==========================================
// FASE 4: MUTAÇÃO
// ==========================================
function renderMutation() {
    phaseTitle.textContent = "4. Mutação";
    phaseProgress.textContent = `Filho ${step + 1} de ${POPULATION_SIZE}`;

    let child = children[step];

    let html = `
        <div class="theory-box">
            <strong>💡 Teoria: Mutação</strong><br>
            A mutação simula erros biológicos raros durante a cópia do DNA. Invertemos aleatoriamente um gene (bit) com uma probabilidade baixa. Isso previne que a população fique geneticamente idêntica e perca a diversidade, o que deixaria a evolução travada num "ótimo local" (uma solução boa, mas não a melhor possível).
        </div>
        <p style="font-size:16px;">Verifique se o filho sofrerá alguma alteração genética acidental.</p>
        <div class="chromosome-builder" style="font-size: 28px; padding: 10px;">
            ${child.chromosome}
        </div>
        <p style="font-size:18px;">Aptidão Inicial: <b>${child.fitness}</b></p>
    `;

    if (mutRoll === 0) {
        html += `<div style="background:#f9ebed; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:0; color:#c0392b;">Role o dado. <b>Se sair o número 6, ocorre mutação!</b></p>
                 </div>
                 <button id="btn-roll-mut" class="action-btn">Rolar Dado (Chance de 1/6)</button>`;
    } else {
        html += `<p style="font-size:20px;">Dado rolou: <b style="font-size:28px;">🎲 ${mutRoll}</b></p>`;
        
        if (mutRoll === 6) {
            if (mutPos === 0) {
                html += `<p style="color:#d35400; font-size:18px; font-weight:bold;">Mutação! Role um dado de 1 a 10 para escolher o bit a inverter.</p>
                         <button id="btn-roll-pos" class="action-btn">Rolar Dado de Posição (1-10)</button>`;
            } else {
                let displayChrom = child.chromosome.substring(0, mutPos-1) + 
                                   `<span style="color:#fff; background:#e74c3c; border-radius:4px; padding:0 3px;">${child.chromosome[mutPos-1]}</span>` + 
                                   child.chromosome.substring(mutPos);
                
                html += `
                    <div class="chromosome-builder" style="font-size: 28px; padding: 10px;">${displayChrom}</div>
                    <p style="font-size:18px;">Bit sorteado: <b>Posição ${mutPos}</b>. O bit foi invertido!</p>
                    <p style="font-size:20px; color:#27ae60;"><b>Nova Aptidão: ${child.fitness}</b></p>
                    <button id="btn-next-mut" class="action-btn success">Salvar Filho Mutado</button>
                `;
            }
        } else {
            html += `<p style="color:#2980b9; font-weight:bold; font-size:18px;">Sem mutação para este filho.</p>
                     <button id="btn-next-mut" class="action-btn success">Avançar para Próximo</button>`;
        }
    }

    iArea.innerHTML = html;

    if (document.getElementById('btn-roll-mut')) document.getElementById('btn-roll-mut').onclick = () => { mutRoll = rollDice(6); render(); };
    if (document.getElementById('btn-roll-pos')) {
        document.getElementById('btn-roll-pos').onclick = () => { 
            mutPos = rollDice(CHROMOSOME_LENGTH); 
            let chars = child.chromosome.split('');
            chars[mutPos-1] = chars[mutPos-1] === '1' ? '0' : '1';
            child.chromosome = chars.join('');
            child.fitness = getFitness(child.chromosome);
            render(); 
        };
    }
    if (document.getElementById('btn-next-mut')) {
        document.getElementById('btn-next-mut').onclick = () => {
            mutRoll = 0; mutPos = 0; step++;
            if (step >= POPULATION_SIZE) { phase = 'READY_NEXT'; }
            render();
        };
    }
}

// ==========================================
// FASE 5: PRÓXIMA GERAÇÃO
// ==========================================
function renderReadyNext() {
    phaseTitle.textContent = "Ciclo Concluído!";
    phaseProgress.textContent = "Pronto";

    iArea.innerHTML = `
        <div class="theory-box" style="margin-bottom: 20px;">
            <strong>💡 Teoria: Nova Geração (Substituição)</strong><br>
            A evolução acontece ao longo das gerações. O ciclo se fecha agora, com a nova geração de filhos substituindo por completo a geração dos pais. Conforme o processo se repete, a ação conjunta de Seleção, Cruzamento e Mutação empurrará a população para indivíduos cada vez mais aptos.
        </div>
        <div style="padding: 30px; background: #eafaf1; border-radius: 10px; border: 2px solid #2ecc71;">
            <h3 style="color:#27ae60; font-size:24px; margin-top:0;">Sucesso! A nova geração está pronta.</h3>
            <p style="font-size:18px; color:#333;">Os filhos gerados assumirão como a nova população e o ciclo recomeça.</p>
            <button id="btn-finish-gen" class="action-btn" style="padding: 15px 30px; font-size: 18px; margin-top:20px;">
                Substituir População e Ir para Geração ${generation + 1}
            </button>
        </div>
    `;

    document.getElementById('btn-finish-gen').onclick = () => {
        // Filhos viram a nova população
        population = children.map((c, index) => ({ id: index + 1, chromosome: c.chromosome, fitness: c.fitness }));
        parents = [];
        children = [];
        generation++;
        phase = 'SELECTION'; // Pula a fase INIT e vai direto para Seleção
        step = 0;
        render();
    };
}

// Inicia a renderização
render();
