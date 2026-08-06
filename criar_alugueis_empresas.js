// ═══════════════════════════════════════════════════════════════
// CRIAR ALUGUÉIS ATIVOS — vincula cada placa à empresa correta
// Cria aluguel MENSAL, usando a Data de Entrega do PDF como retirada.
// NÃO duplica: se a placa já tem aluguel ativo, PULA.
// Grava direto no Firebase com verificação. Cole no Console (F12).
// ═══════════════════════════════════════════════════════════════
(function(){
  console.log('%c═══ CRIAR ALUGUÉIS ATIVOS (68 placas) ═══','font-weight:bold;font-size:15px;color:#2B4BF2');

  var MAPA = {"EQQ2J61": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "GIR7I93": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "RVO7C13": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "SHW9G83": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "SHW9G84": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "SHG3D40": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "SHV7B26": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-07-30", "km": ""}, "SHS2E71": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-07-31", "km": ""}, "SIO9A51": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "FYQ2B92": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-06-28", "km": ""}, "TGZ1E73": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-07-30", "km": ""}, "TGZ6D54": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-07-31", "km": ""}, "SHJ0I58": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2025-08-05", "km": ""}, "RUZ9J78": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2026-05-10", "km": ""}, "FOY3F87": {"empId": "c1780916374941", "empNome": "TRANSSOUZA TRANSPORTE E TURISMO LTDA", "data": "2026-07-28", "km": ""}, "RCY8H74": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2024-12-20", "km": ""}, "SCO5B72": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-01-28", "km": "41916"}, "RTE3J85": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-08-05", "km": ""}, "RNU7E72": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-07-17", "km": "50000"}, "RDK5G66": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-10-02", "km": "83823"}, "SHU8B53": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-10-09", "km": "44206"}, "RVT2A32": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-10-14", "km": "51402"}, "SIC2G45": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-10-20", "km": "55022"}, "EXN2A36": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-11-27", "km": "71725"}, "SIC2G39": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-12-01", "km": ""}, "SHU8B66": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2025-12-01", "km": ""}, "QNH1995": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2026-01-21", "km": ""}, "EYA5J14": {"empId": "c1780917781342", "empNome": "G7 COMPANY LTDA", "data": "2026-04-09", "km": "47709"}, "RUE0E26": {"empId": "c1780917221151", "empNome": "ISS TRANSPORTES & LOGISTICA", "data": "2025-09-19", "km": "89141"}, "RVC9A19": {"empId": "c1780917221151", "empNome": "ISS TRANSPORTES & LOGISTICA", "data": "2025-10-28", "km": "41263"}, "EJD9E52": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-11-01", "km": "44000"}, "EUB9I42": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-11-22", "km": "103236"}, "FLR6J14": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-07-16", "km": "94734"}, "FTI3F81": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-27", "km": "73802"}, "FVJ7F62": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-03", "km": ""}, "GBW2B26": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-27", "km": "72849"}, "GCQ2G23": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-06", "km": "48823"}, "GEH4I81": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-06", "km": "38283"}, "GEZ8H54": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-06", "km": "35653"}, "GJO0D71": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-20", "km": "66675"}, "GJU9H02": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-06", "km": "68750"}, "RML9D09": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2023-03-30", "km": "89146"}, "RPR1G73": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-12", "km": "74405"}, "RUE5E24": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-12", "km": "45141"}, "RUE5F30": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-20", "km": "60585"}, "RUE5F40": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-09-12", "km": "63461"}, "RUL7A99": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "63063"}, "RUP3D82": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "67793"}, "RUP8F63": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-01", "km": "74687"}, "RUT7D45": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "43596"}, "RUX8G52": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "68045"}, "RVD8J06": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-14", "km": "54151"}, "RVD9I55": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-11", "km": "82299"}, "RVD9I67": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-11", "km": "71037"}, "RVD9I71": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-10", "km": "83987"}, "RVO5A91": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-03", "km": ""}, "RVT1A74": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-14", "km": "66585"}, "RVT2A34": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-14", "km": "68541"}, "RVT2A51": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "55789"}, "SDF3C81": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-07-17", "km": "41500"}, "SHF6F23": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "55590"}, "SHF6F28": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "52272"}, "SHF6F29": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-11", "km": "79501"}, "SHG1J02": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-10", "km": "54251"}, "SHH1C11": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-10-09", "km": "56315"}, "SHH6B15": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-01", "km": "62966"}, "SIC2G46": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-01", "km": "60209"}, "SIC2G48": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-01", "km": "36999"}, "SIC2G51": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "57828"}, "SIC2G52": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-12-16", "km": "72459"}, "SYO1G57": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2025-11-19", "km": "64107"}, "FDZ9G34": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-05", "km": "86455"}, "GCI9I23": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-05", "km": "94767"}, "FCH1I73": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-16", "km": ""}, "FCN9G83": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-16", "km": ""}, "RUJ4A55": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-16", "km": ""}, "RUI8I24": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-16", "km": ""}, "EKU9D72": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-09", "km": ""}, "EBL7E41": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-06-16", "km": ""}, "RTE3J75": {"empId": "c1780917028214", "empNome": "RSC TRANSPORTE 2016 LTDA", "data": "2026-07-03", "km": ""}, "EVT1C72": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-03-10", "km": "56541"}, "SHW3A72": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-03-10", "km": "45562"}, "GDE1E83": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-04-08", "km": "34942"}, "SWO4I55": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-05-26", "km": "44334"}, "FCQ8B73": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-05-28", "km": "60167"}, "EUE8G81": {"empId": "c1780916899787", "empNome": "BRJ EXPRESSO TRANSPORTE E LOGISTICA LTDA", "data": "2026-05-26", "km": "59674"}};

  function normPlaca(p){ return String(p||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

  var ref = firebase.database().ref('loka_db');
  ref.once('value').then(function(snap){
    var d = snap.val() || {};
    var ativos = Array.isArray(d.ativos) ? d.ativos.filter(Boolean) : Object.values(d.ativos||{}).filter(Boolean);
    var veiculos = Array.isArray(d.veiculos) ? d.veiculos.filter(Boolean) : Object.values(d.veiculos||{}).filter(Boolean);

    // placas que já têm aluguel ativo (não mexer)
    var jaAtivo = {};
    ativos.forEach(function(a){ if(a && a.placa) jaAtivo[normPlaca(a.placa)] = true; });

    // mapa placa -> veículo (pra pegar id, marca, modelo)
    var veicPorPlaca = {};
    veiculos.forEach(function(v){ if(v && v.placa) veicPorPlaca[normPlaca(v.placa)] = v; });

    var criados = 0, pulados = 0, semVeiculo = 0;
    var novosAtivos = ativos.slice();
    var semVeicList = [];

    Object.keys(MAPA).forEach(function(placa){
      if (jaAtivo[placa]) { pulados++; return; }  // já tem aluguel
      var info = MAPA[placa];
      var veic = veicPorPlaca[placa];
      if (!veic) { semVeiculo++; semVeicList.push(placa); return; }  // veículo não cadastrado

      var novoAtivo = {
        id: 'a' + Date.now() + Math.floor(Math.random()*10000),
        clienteId: info.empId,
        clienteNome: info.empNome,
        veiculoId: veic.id,
        veiculoNome: (veic.marca||'') + ' ' + (veic.modelo||''),
        placa: veic.placa,
        tipo: 'mensal',
        retirada: info.data || '',
        devolucao: '',
        valor: veic.mensal || '',
        dataEntrega: info.data || '',
        kmEntrega: info.km || '',
        criadoEm: new Date().toISOString(),
        obs: 'Criado via importação de frota'
      };
      novosAtivos.push(novoAtivo);
      // marca veículo como alugado
      var vIdx = veiculos.findIndex(function(v){ return v && v.id===veic.id; });
      if (vIdx>=0) veiculos[vIdx].status = 'alugado';
      criados++;
    });

    console.log('%c\nRESUMO DA OPERAÇÃO:','font-weight:bold;color:#0E1B4D');
    console.log('   A criar: '+criados+' aluguéis');
    console.log('   Pulados (já tinham aluguel): '+pulados);
    console.log('   Sem veículo cadastrado: '+semVeiculo);
    if (semVeicList.length) console.log('   Placas sem veículo: '+semVeicList.join(', '));

    if (!criados) { console.log('%c\nNada a criar.','color:#b45309'); return; }

    if (!confirm('Criar '+criados+' aluguéis ativos mensais?\n\n'+pulados+' placas já tinham aluguel (serão mantidas).\n'+semVeiculo+' placas sem veículo cadastrado (serão ignoradas).')) {
      console.log('Cancelado.'); return;
    }

    var updates = {};
    updates['ativos'] = novosAtivos;
    updates['veiculos'] = veiculos;
    updates['_ultimaEscrita'] = Date.now();

    ref.update(updates).then(function(){
      return ref.child('ativos').once('value');
    }).then(function(snap2){
      var at2 = snap2.val() || [];
      at2 = Array.isArray(at2) ? at2.filter(Boolean) : Object.values(at2).filter(Boolean);
      console.log('%c\n✅ CRIADO E VERIFICADO!','color:#0d7a3e;font-weight:bold;font-size:14px');
      console.log('   Total de aluguéis ativos agora: '+at2.length);
      alert('✅ '+criados+' aluguéis criados!\n\nCada placa agora está vinculada à sua empresa.\nA página vai recarregar.');
      setTimeout(function(){ location.reload(true); }, 2500);
    }).catch(function(e){ console.log('%c❌ Erro: '+e.message,'color:#c0392b;font-weight:bold'); });
  }).catch(function(e){ console.log('❌ Erro ao ler:', e.message); });
})();
