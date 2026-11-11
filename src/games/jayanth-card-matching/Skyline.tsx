import { memo, type ReactNode } from 'react'
import styles from './CardMatchingGame.module.css'
import { journeyProgress } from './journey'
export const Skyline = memo(function Skyline({ matches = 0, hero = false, sessionLength = 0 }: { matches?: number; hero?: boolean; sessionLength?: number }) {
  const progress = journeyProgress(matches, sessionLength)
  function Part({ index, children }: { index: number; children: ReactNode }) {
    const stage = progress.sections[index]
    return <g data-stage={stage} data-section={index} data-lit={stage <= progress.stage ? 'true' : 'false'}
      className={`${stage <= progress.stage ? styles.lit : styles.unlit} ${matches && stage === progress.stage ? styles.newlyLit : ''}`}>{children}</g>
  }
  return <svg data-skyline data-progress={progress.stage} data-total={progress.total} className={`${styles.skyline} ${hero ? styles.skylineHero : ''}`} viewBox="0 0 1440 320" role="img" aria-label={`Singapore skyline, ${progress.stage} of ${progress.total} ${progress.total === 6 ? 'landmarks' : 'stages'} illuminated`}>
    <title>Singapore Skyline Journey</title>
    <path fill="#dcebe3" d="M0 290Q210 260 410 288T830 285T1440 285V320H0Z" />
    <g data-landmark="hdb"><Part index={0}><path d="M35 130H170V286H35ZM185 170H283V286H185Z" /></Part>
      <Part index={1}><path d="M53 149H70V168H53ZM88 149H105V168H88ZM123 149H140V168H123ZM53 186H70V205H53ZM88 186H105V205H88ZM123 186H140V205H123ZM53 223H70V242H53ZM88 223H105V242H88ZM123 223H140V242H123ZM200 189H217V208H200ZM242 189H259V208H242ZM200 227H217V246H200ZM242 227H259V246H242Z" /></Part></g>
    <g data-landmark="park"><Part index={2}><path d="M325 215H337V290H325ZM382 224H394V290H382ZM310 260H410V267H310Z" /><circle cx="331" cy="205" r="36" /><circle cx="388" cy="220" r="29" /></Part></g>
    <g data-landmark="mbs"><Part index={3}><path d="M480 116H520L530 287H472ZM555 116H595L603 287H546ZM629 116H669L676 287H619Z" /><path className={styles.windows} d="M490 145H499V266H490ZM566 145H575V266H566ZM641 145H650V266H641Z" /></Part><Part index={4}><path d="M451 99Q572 110 699 82L682 114Q569 140 464 120Z" /></Part></g>
    <g data-landmark="gardens"><Part index={5}><path d="M754 170H766V288H754ZM830 148H842V288H830ZM901 187H913V288H901Z" /><path fill="none" stroke="currentColor" strokeWidth="4" d="M722 152L754 205M797 152L766 205M796 130L830 188M877 130L842 188M879 172L901 222M936 172L913 222" /></Part><Part index={6}><path d="M713 151Q760 180 805 151L790 176Q760 190 730 176ZM785 128Q836 158 887 128L870 154Q836 169 802 154ZM870 170Q907 195 944 170L932 194Q907 207 882 194Z" /></Part></g>
    <g data-landmark="flyer" fill="none" stroke="currentColor" strokeWidth="7"><Part index={7}><circle cx="1080" cy="153" r="86" /><path d="M1080 153L1040 288M1080 153L1120 288M994 153H1166M1080 67V239M1019 92L1141 214M1141 92L1019 214" strokeWidth="3" /></Part><Part index={8}><g strokeWidth="15"><path d="M1076 67H1084M1159 149V157M1076 239H1084M994 149V157M1016 89L1022 95M1138 89L1144 95M1016 211L1022 217M1138 211L1144 217" /></g></Part></g>
    <g data-landmark="waterfront"><Part index={9}><path d="M1204 260Q1255 191 1301 260ZM1276 260Q1324 207 1375 260Z" /><path d="M1195 270H1385V284H1195Z" /><path fill="none" stroke="currentColor" strokeWidth="4" d="M1200 301Q1220 292 1240 301T1280 301T1320 301T1360 301" /></Part></g>
  </svg>
})
