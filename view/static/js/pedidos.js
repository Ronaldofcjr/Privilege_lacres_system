document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    listarPedidos();
    carregarEmpresasSelect();

    const params = new URLSearchParams(window.location.search);
    const editarId = params.get('editar');
    if (editarId) {
        setTimeout(() => editarPedido(parseInt(editarId)), 800);
    }
});

// Toast
function showToast(message, type = "success") {
    const toast = document.getElementById("liveToast");
    const messageBox = document.getElementById("toast-message");

    messageBox.innerText = message;
    toast.className = `toast align-items-center text-bg-${type} border-0`;

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// ============================================================
// VARIÁVEL GLOBAL — guarda todos os pedidos carregados da API
// ============================================================
let todosPedidos = [];
let pedidoParaDeletar = null;


// ============================================================
// LISTAGEM — busca os pedidos na API e renderiza na tabela
// ============================================================
async function listarPedidos() {
    try {
        const response = await fetchAuth(`/pedidos`);
        if (!response) return;

        // Salva na variável global para o filtro poder usar depois
        todosPedidos = await response.json();

        // Renderiza todos os pedidos (sem filtro)
        renderizarPedidos(todosPedidos);
    } catch (error) {
        console.error("Erro ao listar pedidos:", error);
    }
}


// ============================================================
// RENDERIZAÇÃO — recebe uma lista e monta as linhas da tabela
// (separado do listarPedidos para poder ser chamado pelo filtro)
// ============================================================
function renderizarPedidos(pedidos) {
    const corpoTabela = document.getElementById('tabela-pedidos-corpo');
    corpoTabela.innerHTML = '';

    pedidos.forEach(p => {
        const totalCalculado = p.total_pedido || 0;

        const statusClass = p.status === 'Pendente' ? 'bg-warning text-dark' :
                            p.status === 'Em Produção' ? 'bg-primary' : 'bg-success';

        corpoTabela.innerHTML += `
            <tr>
                <td class="fw-bold">${p.numero_pedido}</td>
                <td class="fw-bold text-primary">${p.empresa}</td>
                <td>${p.data}</td>
                <td><span class="badge ${statusClass} px-3">${p.status}</span></td>
                <td class="text-end fw-bold text-dark">R$ ${totalCalculado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                <td class="text-center">
                    <button class="btn btn-link text-success text-decoration-none small" onclick="editarPedido(${p.pedido_id})">
                        <i class="fa-solid fa-pen me-1"></i>
                    </button>
                    <button class="btn btn-link text-danger text-decoration-none small" onclick="excluirPedido(${p.pedido_id})">
                        <i class="fa-solid fa-trash me-1"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}


// ============================================================
// FILTRO — chamado pelo oninput do campo de busca no HTML
// ============================================================
function filtrarPedidos() {
    const termo = document.getElementById('busca-pedido').value.toLowerCase().trim();

    const filtrados = todosPedidos.filter(p =>
        p.numero_pedido.toLowerCase().includes(termo)
    );

    renderizarPedidos(filtrados);
}


// ============================================================
// DELETAR PEDIDO
// ============================================================
async function excluirPedido(id) {
    pedidoParaDeletar = id;

    const modalEl = document.getElementById("confirmModalPedido");
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    const btnConfirm = document.getElementById("confirm-delete-pedido-btn");
    btnConfirm.replaceWith(btnConfirm.cloneNode(true));
    const newBtn = document.getElementById("confirm-delete-pedido-btn");

    newBtn.addEventListener("click", async () => {
        try {
            const response = await fetchAuth(`/pedidos/${pedidoParaDeletar}`, {
                method: 'DELETE'
            });

            if (!response) return;

            if (response.ok) {
                bsModal.hide();
                showToast("Pedido excluído com sucesso!", "success");
                listarPedidos();
            } else {
                showToast("Erro ao excluir pedido.", "danger");
            }
        } catch (error) {
            console.error("Erro ao excluir:", error);
        }
    });
}


// ============================================================
// ITENS DINÂMICOS
// ============================================================
function adicionarLinhaItem(dados = {}) {
    const container = document.getElementById('container-itens');
    const idLinha = Date.now();

    const div = document.createElement('div');
    div.className = 'row g-2 mb-2 align-items-end item-row';
    div.id = `item-${idLinha}`;

    div.innerHTML = `
        <div class="col-md-6">
            <label class="form-label small fw-bold">Produto</label>
            <input type="text" class="form-control campo-produto" placeholder="Produto" value="${dados.produto || ''}" required>
        </div>
        <div class="col-md-2">
            <label class="form-label small fw-bold">Quantidade Milheiro</label>
            <input type="number" step="0.001" class="form-control text-center campo-quantidade" placeholder="Qtd" oninput="calcularTotalPedido()" value="${dados.quantidade || 1}" required>
        </div>
        <div class="col-md-3">
            <label class="form-label small fw-bold">Valor Milheiro</label>
            <input type="number" step="0.01" class="form-control campo-valor" placeholder="Valor Milheiro" oninput="calcularTotalPedido()" value="${dados.valor_milheiro || 0}" required>
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-outline-danger border-0" onclick="removerLinhaItem('${idLinha}')">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    container.appendChild(div);
}

function removerLinhaItem(id) {
    document.getElementById(`item-${id}`).remove();
    calcularTotalPedido();
}


// ============================================================
// TOTAL
// ============================================================
function calcularTotalPedido() {
    let totalGeral = 0;
    const linhas = document.querySelectorAll('.item-row');

    linhas.forEach(linha => {
        const qtd = parseFloat(linha.querySelector('.campo-quantidade').value) || 0;
        const valor = parseFloat(linha.querySelector('.campo-valor').value) || 0;
        totalGeral += (qtd * valor);
    });

    document.getElementById('valor-total-pedido').innerText =
        `R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}


// ============================================================
// SALVAR PEDIDO
// ============================================================
async function salvarPedidoCompleto() {
    const id = document.getElementById('pedido_id').value;

    const itens = Array.from(document.querySelectorAll('.item-row')).map(linha => ({
        produto: linha.querySelector('.campo-produto').value,
        quantidade: parseFloat(linha.querySelector('.campo-quantidade').value),
        valor_milheiro: parseFloat(linha.querySelector('.campo-valor').value)
    }));

    const payload = {
        id_empresa: document.getElementById('id_empresa').value,
        numero_pedido: document.getElementById('numero_pedido').value,
        data: document.getElementById('data').value,
        nf: document.getElementById('nf').value,
        total_nf: document.getElementById('total_nf').value,
        vencimento: document.getElementById('vencimento').value,
        data_entrega: document.getElementById('data_entrega').value,
        status: document.getElementById('status').value,
        itens: itens
    };

    const url = id ? `/pedidos/${id}` : `/pedidos`;
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetchAuth(url, {
            method: metodo,
            body: JSON.stringify(payload)
        });

        if (!response) return;

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalPedido')).hide();
            showToast("Pedido salvo com sucesso!", "success");
            listarPedidos();
        } else {
            showToast("Erro ao salvar o pedido.", "danger");
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}


// ============================================================
// AUXILIARES
// ============================================================
function prepararNovoPedido() {
    document.getElementById('formPedido').reset();
    document.getElementById('pedido_id').value = '';
    document.getElementById('container-itens').innerHTML = '';
    document.getElementById('valor-total-pedido').innerText = 'R$ 0,00';
    adicionarLinhaItem();
}

async function carregarEmpresasSelect() {
    try {
        const response = await fetchAuth(`/empresas`);
        if (!response) return;

        const empresas = await response.json();
        const select = document.getElementById('id_empresa');

        empresas.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id_empresa;
            opt.textContent = emp.razao_social;
            select.appendChild(opt);
        });
    } catch (err) {
        console.warn("Não foi possível carregar a lista de empresas.");
    }
}

async function editarPedido(id) {
    try {
        const response = await fetchAuth(`/pedidos/${id}`);
        if (!response) return;

        const p = await response.json();

        document.getElementById('pedido_id').value = p.pedido_id;
        document.getElementById('id_empresa').value = p.id_empresa;
        document.getElementById('numero_pedido').value = p.numero_pedido;
        document.getElementById('nf').value = p.nf;
        document.getElementById('total_nf').value = p.total_nf;
        document.getElementById('status').value = p.status;

        if (p.data) document.getElementById('data').value = p.data.split('/').reverse().join('-');
        if (p.vencimento) document.getElementById('vencimento').value = p.vencimento.split('/').reverse().join('-');

        const container = document.getElementById('container-itens');
        container.innerHTML = '';
        p.itens.forEach(item => adicionarLinhaItem(item));

        calcularTotalPedido();
        new bootstrap.Modal(document.getElementById('modalPedido')).show();
    } catch (error) {
        console.error("Erro ao carregar pedido:", error);
    }
}