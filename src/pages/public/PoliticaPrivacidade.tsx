import { DocumentoLegal } from '../../components/DocumentoLegal'
import { CONTATO_SUPORTE, DATA_VIGENCIA_DOCUMENTOS, DOMINIO_PLATAFORMA, VERSAO_CONTRATO } from '../../constants/legal'

// Documento redigido pra este projeto (não fornecido pelo usuário) —
// elaborado com apoio de IA, sem revisão advocatícia até o momento. Expande
// as cláusulas 10/11 do Contrato de Adesão num documento completo de LGPD,
// incluindo os operadores/fornecedores que tratam dados por conta da
// plataforma (em vez da frase absoluta "não compartilhamos com terceiros" —
// o ponto 3 do briefing pedia essa correção).
export function PoliticaPrivacidade() {
  return (
    <DocumentoLegal titulo="Política de Privacidade da Plataforma Oia a Conta">
      <p><em>Última atualização: {DATA_VIGENCIA_DOCUMENTOS}</em></p>

      <p>
        Esta Política de Privacidade descreve como a <strong>Oia a Conta</strong> ("CONTRATADA") trata dados
        pessoais no contexto da plataforma, em conformidade com a <strong>Lei nº 13.709/2018 (LGPD)</strong>.
        Ela complementa o Contrato de Adesão e os Termos de Uso aceitos no momento da contratação.
      </p>

      <h2>1. Quem Somos e Papéis no Tratamento</h2>
      <p>
        1.1. A CONTRATADA atua como <strong>controladora</strong> dos dados pessoais do CONTRATANTE e de seus
        usuários vinculados (administradores, garçons, cozinha, entregadores), coletados para viabilizar o
        acesso e uso da plataforma.
      </p>
      <p>
        1.2. Em relação aos dados pessoais dos <strong>clientes finais</strong> do CONTRATANTE (consumidores que
        fazem pedidos, se cadastram no cardápio digital ou fornecem dados de entrega), a CONTRATADA atua
        predominantemente como <strong>operadora</strong>, tratando esses dados em nome e por instrução do
        CONTRATANTE, que é o controlador desses dados perante seus próprios clientes.
      </p>

      <h2>2. Dados Coletados</h2>
      <p>2.1. Dados do CONTRATANTE e de seus usuários vinculados:</p>
      <ul>
        <li>dados de cadastro: nome, e-mail, telefone, CNPJ, endereço do estabelecimento;</li>
        <li>dados de acesso: senha (armazenada de forma criptografada), histórico de login, endereço IP;</li>
        <li>dados de uso da plataforma: ações realizadas no painel, registros de auditoria;</li>
        <li>dados de pagamento: dados necessários à cobrança via PIX (a CONTRATADA não armazena dados sensíveis de cartão de crédito diretamente).</li>
      </ul>
      <p>2.2. Dados de clientes finais inseridos pelo CONTRATANTE ou coletados via cardápio digital/pedidos:</p>
      <ul>
        <li>nome, telefone e, quando aplicável, endereço de entrega;</li>
        <li>histórico de pedidos e preferências de consumo;</li>
        <li>mensagens trocadas via integração de WhatsApp, quando essa funcionalidade é utilizada.</li>
      </ul>

      <h2>3. Finalidades e Bases Legais</h2>
      <ul>
        <li><strong>Execução do contrato</strong> (art. 7º, V, LGPD): viabilizar o cadastro, o acesso e o uso das funcionalidades contratadas.</li>
        <li><strong>Cumprimento de obrigação legal ou regulatória</strong> (art. 7º, II): emissão/guarda de registros fiscais e contábeis exigidos por lei, atendimento a autoridades.</li>
        <li><strong>Legítimo interesse</strong> (art. 7º, IX), observados os limites legais: segurança da plataforma, prevenção a fraudes, melhoria dos serviços e suporte ao CONTRATANTE.</li>
        <li><strong>Consentimento</strong> (art. 7º, I), quando aplicável: comunicações de marketing ou funcionalidades opcionais que exijam autorização específica.</li>
      </ul>

      <h2>4. Operadores e Fornecedores que Tratam Dados por Conta da Plataforma</h2>
      <p>
        4.1. Para prestar o serviço, a CONTRATADA utiliza fornecedores que atuam como <strong>operadores</strong>{' '}
        de dados pessoais, tratando informações estritamente para viabilizar a prestação do serviço contratado
        — <strong>os dados não são vendidos nem compartilhados para fins comerciais de terceiros</strong>.
        Atualmente, esses fornecedores incluem, conforme a funcionalidade utilizada:
      </p>
      <ul>
        <li>provedores de hospedagem e infraestrutura em nuvem (armazenamento de banco de dados e arquivos da plataforma);</li>
        <li>provedor de envio de e-mails transacionais (confirmação de cadastro, verificação, notificações);</li>
        <li>provedor de integração com WhatsApp, quando o CONTRATANTE utiliza o chatbot/atendimento integrado;</li>
        <li>processador de pagamentos (Mercado Pago), para cobrança via PIX;</li>
        <li>provedores de mapas/geolocalização, quando utilizadas funcionalidades de entrega/roteirização;</li>
        <li>provedor de autenticação social (Google), quando o CONTRATANTE opta por login com Google.</li>
      </ul>
      <p>
        4.2. Esses fornecedores têm acesso apenas aos dados estritamente necessários à sua função e estão
        sujeitos a obrigações contratuais e/ou legais de proteção de dados.
      </p>
      <p>
        4.3. A CONTRATADA poderá divulgar dados pessoais a autoridades públicas quando exigido por lei, ordem
        judicial ou requisição regulatória.
      </p>

      <h2>5. Armazenamento e Segurança</h2>
      <p>
        5.1. Os dados são armazenados em infraestrutura com controles técnicos e administrativos razoáveis
        (criptografia de senhas, controle de acesso por perfil/permissão, backups) destinados a reduzir o risco
        de acesso não autorizado, perda ou vazamento.
      </p>
      <p>
        5.2. Nenhum sistema é absolutamente livre de risco. Em caso de incidente de segurança que possa
        acarretar risco relevante aos titulares, a CONTRATADA adotará as medidas cabíveis, incluindo, quando
        exigido pela LGPD, a comunicação à Autoridade Nacional de Proteção de Dados (ANPD) e aos titulares
        afetados.
      </p>

      <h2>6. Retenção e Exclusão dos Dados</h2>
      <p>
        6.1. Os dados pessoais são mantidos enquanto a conta estiver ativa e pelo período adicional necessário
        para cumprimento de obrigações legais, fiscais, regulatórias ou para exercício regular de direitos em
        processos administrativos ou judiciais.
      </p>
      <p>
        6.2. Após o encerramento definitivo da conta e decorridos os prazos legais de guarda aplicáveis, os
        dados poderão ser excluídos ou anonimizados, conforme detalhado na cláusula 15 do Contrato de Adesão.
      </p>

      <h2>7. Direitos do Titular</h2>
      <p>Nos termos da LGPD, o titular dos dados pode solicitar, mediante contato pelos canais oficiais:</p>
      <ul>
        <li>confirmação da existência de tratamento e acesso aos dados;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
        <li>portabilidade dos dados a outro fornecedor de serviço, observadas as limitações técnicas e comerciais;</li>
        <li>eliminação dos dados tratados com base no consentimento, quando aplicável;</li>
        <li>informação sobre entidades públicas e privadas com as quais os dados foram compartilhados;</li>
        <li>revogação do consentimento, quando essa for a base legal do tratamento.</li>
      </ul>
      <p>
        7.1. Clientes finais do CONTRATANTE que desejarem exercer esses direitos sobre seus próprios dados
        devem, preferencialmente, contatar diretamente o estabelecimento (CONTRATANTE), controlador desses
        dados; a CONTRATADA prestará o suporte técnico necessário para viabilizar o atendimento.
      </p>

      <h2>8. Cookies e Tecnologias Similares</h2>
      <p>
        8.1. A plataforma pode utilizar cookies e tecnologias similares estritamente necessários ao
        funcionamento (ex: manter a sessão do usuário autenticado) e, eventualmente, cookies de desempenho para
        entender o uso da plataforma e melhorá-la.
      </p>

      <h2>9. Encarregado (DPO) e Contato</h2>
      <p>
        9.1. Dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade ou ao tratamento
        de dados pessoais podem ser encaminhadas para <strong>{CONTATO_SUPORTE}</strong>.
      </p>

      <h2>10. Alterações Desta Política</h2>
      <p>
        10.1. Esta Política poderá ser atualizada para refletir mudanças legais, regulatórias, técnicas ou nos
        fornecedores utilizados pela plataforma, nas mesmas condições previstas na cláusula 17 do Contrato de
        Adesão.
      </p>

      <p>
        <strong>Oia a Conta</strong> — Plataforma de gestão para restaurantes e delivery.<br />
        Versão: {VERSAO_CONTRATO} · Data de vigência: {DATA_VIGENCIA_DOCUMENTOS}<br />
        Canal de atendimento: {CONTATO_SUPORTE} · Site: {DOMINIO_PLATAFORMA}
      </p>
    </DocumentoLegal>
  )
}
