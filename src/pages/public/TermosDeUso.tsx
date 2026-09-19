import { DocumentoLegal } from '../../components/DocumentoLegal'
import { CONTATO_SUPORTE, DATA_VIGENCIA_DOCUMENTOS, DOMINIO_PLATAFORMA, VERSAO_CONTRATO } from '../../constants/legal'

// Documento redigido pra este projeto (não fornecido pelo usuário, ao
// contrário do Contrato de Adesão) — elaborado com apoio de IA, seguindo a
// mesma estrutura/tom do contrato, sem revisão advocatícia até o momento.
// Cobre o que hoje estava misturado nas cláusulas 9/12/13/14 do contrato:
// contas, condutas proibidas, conteúdo inserido, disponibilidade,
// propriedade intelectual e rescisão por violação.
export function TermosDeUso() {
  return (
    <DocumentoLegal titulo="Termos de Uso da Plataforma Oia a Conta">
      <p><em>Última atualização: {DATA_VIGENCIA_DOCUMENTOS}</em></p>

      <p>
        Estes Termos de Uso regulam a utilização da plataforma <strong>Oia a Conta</strong> e complementam o{' '}
        <strong>Contrato de Adesão</strong> aceito no momento da contratação. Em caso de conflito entre este
        documento e o Contrato de Adesão quanto a condições comerciais (preço, cobrança, cancelamento), prevalece
        o Contrato de Adesão; quanto a regras de conduta e uso da plataforma, prevalece este documento.
      </p>

      <h2>1. Contas e Credenciais de Acesso</h2>
      <p>1.1. O acesso à plataforma é feito por meio de conta vinculada a um e-mail e senha, ou por login social (Google), quando disponível.</p>
      <p>
        1.2. O CONTRATANTE é responsável por criar e gerenciar as contas de usuários vinculadas ao seu
        estabelecimento (administradores, garçons, cozinha, entregadores etc.) e pelas permissões atribuídas a
        cada uma.
      </p>
      <p>
        1.3. É proibido compartilhar credenciais de acesso com terceiros não autorizados, ceder o uso da conta
        ou permitir acesso por pessoas fora da organização do CONTRATANTE, exceto quando expressamente previsto
        pela funcionalidade da plataforma (ex: contas de funcionários criadas pelo próprio CONTRATANTE).
      </p>
      <p>
        1.4. O CONTRATANTE deve comunicar imediatamente a CONTRATADA em caso de suspeita de uso não autorizado
        de qualquer conta vinculada ao seu estabelecimento.
      </p>

      <h2>2. Condutas Proibidas</h2>
      <p>Ao utilizar a plataforma, é vedado:</p>
      <ul>
        <li>praticar atividades ilícitas, fraudulentas ou que violem direitos de terceiros ou a legislação vigente;</li>
        <li>tentar obter acesso não autorizado a sistemas, contas, servidores ou dados de outros usuários;</li>
        <li>introduzir vírus, malware, ou qualquer código destinado a interromper, danificar ou limitar o funcionamento da plataforma;</li>
        <li>realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma, salvo quando expressamente permitido por lei;</li>
        <li>utilizar robôs, scrapers ou outros meios automatizados para acessar a plataforma fora das integrações oficiais disponibilizadas;</li>
        <li>sobrecarregar deliberadamente a infraestrutura da plataforma (ex: ataques de negação de serviço);</li>
        <li>utilizar a plataforma para envio de spam, conteúdo enganoso ou comunicações não solicitadas a terceiros, inclusive via integrações de WhatsApp;</li>
        <li>utilizar a plataforma para cadastrar produtos, descrições ou cobranças fraudulentas ou enganosas aos consumidores finais.</li>
      </ul>
      <p>
        2.1. A violação de qualquer conduta prevista nesta cláusula autoriza a CONTRATADA a suspender ou
        encerrar o acesso do CONTRATANTE à plataforma, sem prejuízo de outras medidas cabíveis.
      </p>

      <h2>3. Conteúdo Inserido pelo Contratante</h2>
      <p>
        3.1. Entende-se por "conteúdo do Contratante" todo dado, texto, imagem, preço, cardápio, informação de
        cliente, pedido ou qualquer outra informação inserida na plataforma pelo CONTRATANTE ou por seus
        usuários vinculados.
      </p>
      <p>
        3.2. O CONTRATANTE é o único responsável pela legalidade, veracidade, exatidão e titularidade do
        conteúdo inserido, incluindo eventuais direitos autorais de imagens ou textos utilizados no cardápio
        digital.
      </p>
      <p>
        3.3. A CONTRATADA não realiza curadoria prévia do conteúdo inserido pelo CONTRATANTE, mas poderá
        removê-lo ou suspender a conta em caso de violação destes Termos, da lei, ou de notificação fundamentada
        de terceiro.
      </p>

      <h2>4. Disponibilidade da Plataforma</h2>
      <p>
        4.1. A CONTRATADA envida esforços razoáveis para manter a plataforma disponível de forma contínua, sem
        garantir disponibilidade ininterrupta (SLA), tendo em vista a natureza do serviço prestado por meio de
        infraestrutura própria e de terceiros (hospedagem, conectividade, APIs externas).
      </p>
      <p>
        4.2. Situações de indisponibilidade decorrentes de manutenção, atualização, falhas de infraestrutura ou
        de serviços de terceiros, ou de força maior/caso fortuito, estão detalhadas no Contrato de Adesão
        (cláusula 8) e não geram, por si só, direito a indenização.
      </p>

      <h2>5. Propriedade Intelectual e Licença de Uso</h2>
      <p>
        5.1. A plataforma, seu software, código-fonte, marca, layout, identidade visual e demais elementos são
        de titularidade da CONTRATADA ou de terceiros licenciantes, protegidos pela legislação de propriedade
        intelectual aplicável.
      </p>
      <p>
        5.2. Mediante a contratação, a CONTRATADA concede ao CONTRATANTE uma licença de uso limitada, não
        exclusiva, pessoal, intransferível e revogável, restrita ao período de vigência da contratação e à
        finalidade de gestão do seu próprio estabelecimento.
      </p>
      <p>
        5.3. Essa licença não inclui o direito de sublicenciar, revender, ceder ou disponibilizar o acesso à
        plataforma a terceiros fora da própria organização do CONTRATANTE.
      </p>
      <p>
        5.4. O conteúdo inserido pelo CONTRATANTE permanece de sua titularidade; ao inseri-lo na plataforma, o
        CONTRATANTE concede à CONTRATADA licença necessária para hospedar, processar e exibir esse conteúdo
        estritamente para fins de prestação do serviço (ex: exibição do cardápio público).
      </p>

      <h2>6. Isenções e Limitações de Responsabilidade</h2>
      <p>
        6.1. A CONTRATADA não se responsabiliza por decisões comerciais, operacionais ou fiscais tomadas pelo
        CONTRATANTE com base nas informações e relatórios disponibilizados pela plataforma.
      </p>
      <p>
        6.2. A CONTRATADA não se responsabiliza por falhas, indisponibilidades ou alterações em serviços de
        terceiros integrados à plataforma (ex: gateway de pagamento, WhatsApp, provedores de hospedagem),
        conforme já previsto no Contrato de Adesão (cláusula 12).
      </p>
      <p>
        6.3. Nos limites permitidos pela legislação aplicável, notadamente o Código de Defesa do Consumidor
        quando aplicável, a responsabilidade da CONTRATADA por eventuais danos diretamente relacionados à
        prestação do serviço fica limitada ao valor efetivamente pago pelo CONTRATANTE nos últimos 12 (doze)
        meses anteriores ao evento.
      </p>

      <h2>7. Suspensão e Rescisão por Violação</h2>
      <p>
        7.1. Sem prejuízo do direito de cancelamento ordinário previsto no Contrato de Adesão, a CONTRATADA
        poderá suspender ou encerrar, unilateralmente, o acesso do CONTRATANTE que violar estes Termos de Uso,
        o Contrato de Adesão ou a legislação aplicável, mediante comunicação prévia sempre que possível, exceto
        em casos de risco iminente à segurança da plataforma ou de terceiros, quando a suspensão poderá ser
        imediata.
      </p>
      <p>
        7.2. A rescisão por violação não exime o CONTRATANTE do pagamento de valores já devidos até a data do
        encerramento.
      </p>

      <h2>8. Alterações Destes Termos</h2>
      <p>
        8.1. Estes Termos poderão ser atualizados nas mesmas condições previstas na cláusula 17 do Contrato de
        Adesão.
      </p>

      <h2>9. Foro e Legislação Aplicável</h2>
      <p>
        9.1. Aplicam-se a estes Termos de Uso as mesmas disposições de legislação aplicável e foro previstas na
        cláusula 19 do Contrato de Adesão.
      </p>

      <p>
        <strong>Oia a Conta</strong> — Plataforma de gestão para restaurantes e delivery.<br />
        Versão: {VERSAO_CONTRATO} · Data de vigência: {DATA_VIGENCIA_DOCUMENTOS}<br />
        Canal de atendimento: {CONTATO_SUPORTE} · Site: {DOMINIO_PLATAFORMA}
      </p>
    </DocumentoLegal>
  )
}
