const express = require('express');
const router = express.Router();
const cartasController = require('../controllers/cartasController');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

// 1. Listagem geral do acervo (pública, enriquecida se logado)
router.get('/', optionalAuth, cartasController.listarCartas);

// 2. Categorias temáticas
router.get('/categorias', cartasController.obterCategorias);

// 3. Cartas guardadas pelo usuário autenticado (Caixa de Memórias)
router.get('/guardadas', authMiddleware, cartasController.listarCartasGuardadas);

// 3.1 Minhas cartas escritas no jornal pelo usuário autenticado
router.get('/minhas', authMiddleware, cartasController.listarMinhasCartas);

// 4. Detalhes de uma carta específica (com contagem de leitura e log)
router.get('/:id', optionalAuth, cartasController.obterCartaPorId);

// 5. Enviar uma nova carta para o acervo (anônima ou autenticada)
router.post('/', optionalAuth, cartasController.criarCarta);

// 6. Carimbar e guardar carta na caixa de memórias (com limite do Plano Free)
router.post('/:id/carimbar', authMiddleware, cartasController.carimbarCarta);

// 7. Remover carimbo / retirar carta da caixa
router.delete('/:id/carimbar', authMiddleware, cartasController.descarimbarCarta);

// 8. Anexar bilhete / nota marginal na carta
router.post('/:id/notas', authMiddleware, cartasController.adicionarNotaCarta);

module.exports = router;
