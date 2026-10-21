const CORPUS_BOOK_CSS = "\n:host {\n  --desk-bg:#c6c6c6;\n  --desk-paper:#f5f0e4;\n  --desk-ink:#101010;\n  --desk-blue:#001d67;\n  --desk-line:#171717;\n  --desk-soft:#dedede;\n  --desk-green:#0c5d48;\n  --desk-orange:#8a431d;\n  --desk-violet:#4d376f;\n  display:block;\n  min-width:0;\n  color:var(--desk-ink);\n  font-family:var(--st-code-font,ui-monospace,SFMono-Regular,Menlo,monospace);\n}\n*{box-sizing:border-box}\nbutton,input,select{font:inherit;color:inherit}\nbutton{border-radius:0}\n.study-desk{position:relative;width:100%;height:100%;min-height:46rem;overflow:hidden;border:2px solid #111;background:var(--desk-bg);box-shadow:inset 1px 1px #fff,inset -1px -1px #555,8px 8px 0 rgba(0,0,0,.12);outline:none}\n.study-desk:focus-visible{outline:none}\n.desk-toolbar{height:3.15rem;display:flex;align-items:center;gap:.75rem;padding:.42rem .55rem;border-bottom:2px solid #111;background:#d6d6d6;box-shadow:inset 1px 1px #fff,inset 0 -1px #777}\n.desk-mark{display:grid;place-items:center;width:2.15rem;height:2.15rem;border:2px solid #111;background:#111;color:#fff;font-weight:900;font-size:.8rem;letter-spacing:-.06em}\n.desk-title{display:grid;min-width:0;line-height:1.05}.desk-title strong{overflow:hidden;font-size:.72rem;letter-spacing:.12em;text-overflow:ellipsis;white-space:nowrap}.desk-title span{margin-top:.24rem;color:#4c4c4c;font-size:.56rem;letter-spacing:.04em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.desk-tabs{display:flex;align-items:center;gap:.28rem;min-width:0;margin-left:auto;overflow-x:auto;scrollbar-width:none}.desk-tabs::-webkit-scrollbar{display:none}\n.desk-tab,.desk-arrow,.desk-action{min-height:2rem;padding:.32rem .55rem;border:2px solid;border-color:#fff #4c4c4c #4c4c4c #fff;background:#c9c9c9;cursor:pointer;font-size:.58rem;font-weight:800;letter-spacing:.04em;white-space:nowrap}\n.desk-tab:hover,.desk-arrow:hover,.desk-action:hover,.desk-tab:focus-visible,.desk-arrow:focus-visible,.desk-action:focus-visible{outline:1px dotted #111;outline-offset:-4px;background:#e1e1e1}\n.desk-tab.active{border-color:#444 #fff #fff #444;background:#9daac0;color:#061a43}\n.desk-nav{display:flex;gap:.2rem}.desk-arrow{width:2rem;padding:0;font-size:1rem}.desk-action.primary{background:#001d67;color:#fff;border-color:#6278b6 #000 #000 #6278b6}\n.route-toolbar{display:flex;align-items:center;gap:.38rem;margin-left:.2rem;padding:.25rem .35rem;border:1px solid #555;background:#efdfad;color:#2c2207;font-size:.52rem;font-weight:900;white-space:nowrap}.route-toolbar button{width:1.65rem;height:1.55rem;padding:0;border:2px solid;border-color:#fff #555 #555 #fff;background:#c9c9c9;cursor:pointer;font-weight:900}.route-toolbar button:hover,.route-toolbar button:focus-visible{outline:1px dotted #111;outline-offset:-4px;background:#fff}\n.desk-strip{display:flex;align-items:stretch;gap:.8rem;width:100%;height:calc(100% - 5.25rem);padding:.8rem;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;scroll-padding:.8rem;overscroll-behavior-x:contain;scrollbar-width:auto;scrollbar-color:#777 #d9d9d9}\n.desk-strip::-webkit-scrollbar{height:1rem}.desk-strip::-webkit-scrollbar-track{border-top:1px solid #777;background:#ddd}.desk-strip::-webkit-scrollbar-thumb{border:2px solid;border-color:#fff #444 #444 #fff;background:#aaa}\n.desk-window{--pane-accent:var(--desk-blue);position:relative;flex:0 0 min(48rem,calc(100vw - 7rem));height:100%;min-width:34rem;overflow:hidden;scroll-snap-align:start;border:2px solid;border-color:#fff #333 #333 #fff;background:#ececec;box-shadow:2px 2px 0 #111;transition:filter .16s ease,transform .16s ease}\n.desk-window.care-pane{flex-basis:min(34rem,calc(100vw - 7rem));min-width:27rem}\n.desk-window.inspector-pane{flex-basis:min(36rem,calc(100vw - 7rem));min-width:29rem}\n.desk-window.pane-focused{filter:none}.desk-window:not(.pane-focused){filter:saturate(.78)}\n.window-titlebar{height:2.35rem;display:flex;align-items:center;gap:.5rem;padding:.35rem .45rem;background:var(--pane-accent);color:#fff;border-bottom:2px solid #111}\n.window-titlebar strong{overflow:hidden;font-size:.65rem;letter-spacing:.09em;text-overflow:ellipsis;white-space:nowrap}.window-titlebar span{margin-left:auto;padding:.18rem .34rem;border:1px solid rgba(255,255,255,.65);font-size:.52rem;white-space:nowrap}\n.window-body{height:calc(100% - 2.35rem);overflow:auto;overscroll-behavior:contain;background:#efefef;scrollbar-color:#777 #ddd}\n.source-layout{display:grid;grid-template-columns:12.5rem minmax(0,1fr);min-height:100%}\n.contents-rail{position:sticky;top:0;align-self:start;height:100%;min-height:100%;padding:.72rem;border-right:2px solid #777;background:#d5d5d5}\n.rail-label,.pane-kicker,.section-number,.trace-label{display:block;color:#4a4a4a;font-size:.53rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase}\n.contents-rail h3{margin:.45rem 0 .72rem;font-size:.78rem;line-height:1.22}\n.chapter-list{display:grid;gap:.3rem}.chapter-button{width:100%;padding:.5rem .48rem;border:1px solid #676767;background:#e7e7e7;text-align:left;cursor:pointer;font-size:.58rem;line-height:1.28}.chapter-button:hover,.chapter-button:focus-visible{outline:1px dotted #111;outline-offset:-4px;background:#fff}.chapter-button.active{border:2px solid #111;background:#fff;font-weight:850}.chapter-button small{display:block;margin-top:.22rem;color:#666;font-size:.48rem}\n.source-copy{padding:1.4rem 1.7rem 3rem;background:var(--desk-paper)}\n.source-head{margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid #9c907e}.source-head h2{margin:.35rem 0 .45rem;font:500 clamp(1.55rem,3vw,2.45rem)/1.06 Georgia,\"Times New Roman\",serif;letter-spacing:-.025em}.source-head p{margin:0;color:#655e54;font:italic .84rem/1.5 Georgia,\"Times New Roman\",serif}\n.passage{display:block;width:100%;margin:0;padding:1rem .2rem 1.35rem;border:0;border-top:1px solid rgba(78,64,47,.2);background:transparent;text-align:left;cursor:pointer}.passage-row:first-of-type .passage{border-top:0}.passage:hover,.passage:focus-visible{outline:1px dotted #5a4b39;outline-offset:4px;background:rgba(145,111,66,.055)}.passage.selected{background:linear-gradient(90deg,rgba(138,67,29,.13),transparent 52%);box-shadow:inset 3px 0 var(--desk-orange)}\n.passage-address{display:block;margin-bottom:.52rem;color:#8a431d;font:800 .52rem/1.2 var(--st-code-font,ui-monospace,monospace);letter-spacing:.08em}.passage-text{display:block;max-width:70ch;font:1.04rem/1.78 Georgia,\"Times New Roman\",serif;text-wrap:pretty}.passage-links{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.7rem}.passage-link{position:relative;z-index:2;padding:.25rem .38rem;border:1px solid #8a431d;background:#f3e5d3;color:#653113;cursor:pointer;font-size:.5rem;font-weight:800}\n.care-head{padding:1rem 1rem .8rem;border-bottom:2px solid #888;background:#d8d8d8}.care-head h2{margin:.35rem 0 .35rem;font:800 1.02rem/1.2 var(--st-code-font,ui-monospace,monospace);letter-spacing:-.015em}.care-head p{margin:0;color:#555;font-size:.57rem;line-height:1.45}.layer-route{display:flex;align-items:center;gap:.28rem;margin-top:.7rem;color:#555;font-size:.5rem}.layer-route b{padding:.2rem .3rem;border:1px solid #777;background:#eee;color:var(--pane-accent)}\n.route-focus{min-height:100%;padding:.8rem;background:repeating-linear-gradient(135deg,#dedede 0 10px,#d7d7d7 10px 20px)}.route-focus-head{display:flex;align-items:flex-start;gap:.7rem;margin-bottom:.7rem;padding:.75rem;border:2px solid #555;background:#efdfad;box-shadow:inset 1px 1px #fff}.route-focus-head>div{min-width:0}.route-focus-head strong{display:block;margin-top:.22rem;font-size:.75rem;line-height:1.28;overflow-wrap:anywhere}.route-focus-head span{display:block;color:#554b30;font-size:.5rem;line-height:1.4;letter-spacing:.05em}.route-close{margin-left:auto;min-width:5.4rem;padding:.38rem .5rem;border:2px solid;border-color:#fff #555 #555 #fff;background:#c8c8c8;cursor:pointer;font-size:.52rem;font-weight:900;white-space:nowrap}.route-close:hover,.route-close:focus-visible{outline:1px dotted #111;outline-offset:-4px;background:#fff}.route-sheet{margin-bottom:.65rem;border:1px solid #555;background:#d2d2d2}.route-sheet h3{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:0;padding:.48rem .55rem;border-bottom:1px solid #666;background:#c5c5c5;font-size:.56rem;line-height:1.35}.route-sheet h3 b{padding:.14rem .25rem;background:#111;color:#fff;font-size:.45rem}.route-list{display:grid;gap:1px;padding:1px;background:#777}.route-card{display:block;width:100%;padding:.7rem;border:0;background:#f0f0f0;text-align:left;cursor:pointer}.route-card:hover,.route-card:focus-visible{outline:1px dotted #111;outline-offset:-5px;background:#fff}.route-card.selected{background:#fff4d5;box-shadow:inset 4px 0 var(--pane-accent)}.route-card-id{display:block;color:var(--pane-accent);font-size:.5rem;font-weight:900;line-height:1.35;overflow-wrap:anywhere}.route-card-text{display:block;margin-top:.4rem;font-size:.66rem;line-height:1.5;text-wrap:pretty}.route-card-via{display:block;margin-top:.45rem;color:#666;font-size:.46rem;line-height:1.35}.route-empty{padding:1rem;border:1px solid #777;background:#eee;color:#555;font-size:.58rem;line-height:1.55}.route-selected-note{margin:.7rem;padding:.6rem;border:1px solid #806e34;background:#fff0bd;font-size:.53rem;line-height:1.5}.route-source-copy{display:grid;gap:.65rem;padding:1rem;background:var(--desk-paper)}.route-source-card{padding:1rem;border:1px solid #8e806a;background:#fffaf0;cursor:pointer}.route-source-card:hover,.route-source-card:focus-visible{outline:2px dotted #5a4b39;outline-offset:-6px}.route-source-card .passage-text{font-size:1rem}.route-source-card .passage-address{display:flex;justify-content:space-between;gap:1rem}.route-source-card .passage-address b{color:#5d554a;font-weight:600}\n.care-sections{padding:.7rem}.care-section{margin:0 0 .55rem;border:1px solid #555;background:#dadada}.care-section>summary{display:flex;align-items:center;gap:.5rem;padding:.55rem .6rem;cursor:pointer;list-style:none;background:#cfcfcf;font-size:.62rem;font-weight:850;line-height:1.3}.care-section>summary::-webkit-details-marker{display:none}.care-section>summary::before{content:\"+\";display:grid;place-items:center;width:1rem;height:1rem;border:1px solid #555;background:#eee;font-weight:900}.care-section[open]>summary::before{content:\"\u2212\"}.care-section>summary small{margin-left:auto;color:#5d5d5d;font-size:.48rem}.axiom-list{display:grid;gap:1px;padding:1px;background:#777}.axiom-button{display:block;width:100%;padding:.72rem .72rem .8rem;border:0;background:#f0f0f0;text-align:left;cursor:pointer}.axiom-button:hover,.axiom-button:focus-visible{outline:1px dotted #111;outline-offset:-5px;background:#fff}.axiom-button.selected{background:#fff4d5;box-shadow:inset 4px 0 var(--pane-accent)}.axiom-id{display:block;color:var(--pane-accent);font-size:.5rem;font-weight:900;line-height:1.35;overflow-wrap:anywhere}.axiom-text{display:block;margin-top:.42rem;font-size:.67rem;line-height:1.52;text-wrap:pretty}.axiom-trace{display:block;margin-top:.48rem;color:#666;font-size:.48rem;letter-spacing:.03em}\n.inspector-empty{display:grid;place-items:center;min-height:100%;padding:2rem;text-align:center;background:repeating-linear-gradient(135deg,#e6e6e6 0 8px,#dedede 8px 16px)}.inspector-empty>div{max-width:24rem;padding:1.2rem;border:2px solid #555;background:#eee;box-shadow:inset 1px 1px #fff,2px 2px #777}.inspector-empty b{display:block;margin-bottom:.55rem;font-size:.75rem;letter-spacing:.08em}.inspector-empty p{margin:0;color:#555;font-size:.6rem;line-height:1.55}\n.inspector-content{min-height:100%;padding:1rem;background:#e9e9e9}.inspect-id{color:var(--pane-accent);font-size:.55rem;font-weight:900;line-height:1.4;overflow-wrap:anywhere}.inspect-title{margin:.5rem 0 .65rem;font-size:1rem;line-height:1.25}.inspect-text{margin:0;padding:.85rem;border:1px solid #555;background:#fff;box-shadow:inset 1px 1px #ddd;font-size:.72rem;line-height:1.62;text-wrap:pretty}.inspect-text.source{font:1rem/1.72 Georgia,\"Times New Roman\",serif}.inspect-meta{margin:.55rem 0;color:#5c5c5c;font-size:.5rem;line-height:1.5}\n.rating-box{margin:.8rem 0;padding:.65rem;border:1px solid #555;background:#d5d5d5}.rating-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.5rem;font-size:.55rem}.stars{display:flex;gap:.2rem}.star{width:2rem;height:1.8rem;padding:0;border:2px solid;border-color:#fff #555 #555 #fff;background:#c4c4c4;cursor:pointer;font-size:.95rem;line-height:1}.star.active{background:#001d67;color:#ffd447;border-color:#7487bd #000 #000 #7487bd}.star:hover,.star:focus-visible{outline:1px dotted #111;outline-offset:-4px}\n.trace-group{margin-top:.75rem;border:1px solid #555;background:#d6d6d6}.trace-group h4{display:flex;align-items:center;justify-content:space-between;margin:0;padding:.48rem .55rem;border-bottom:1px solid #777;background:#c6c6c6;font-size:.57rem;letter-spacing:.06em}.trace-group h4 b{display:grid;place-items:center;min-width:1.25rem;height:1.1rem;padding:0 .2rem;background:#111;color:#fff;font-size:.48rem}.trace-list{display:grid;gap:1px;padding:1px;background:#888}.trace-card{display:block;width:100%;padding:.58rem .62rem;border:0;background:#eee;text-align:left;cursor:pointer}.trace-card:hover,.trace-card:focus-visible{outline:1px dotted #111;outline-offset:-4px;background:#fff}.trace-card strong{display:block;color:var(--pane-accent);font-size:.5rem;line-height:1.35;overflow-wrap:anywhere}.trace-card span{display:-webkit-box;overflow:hidden;margin-top:.28rem;font-size:.58rem;line-height:1.42;-webkit-box-orient:vertical;-webkit-line-clamp:3}.trace-empty{padding:.55rem;color:#666;background:#eee;font-size:.52rem}\n.desk-status{height:2.1rem;display:flex;align-items:center;gap:.55rem;padding:.3rem .55rem;border-top:2px solid #111;background:#cecece;font-size:.5rem}.status-cell{padding:.26rem .42rem;border:1px solid;border-color:#666 #fff #fff #666;background:#c2c2c2;white-space:nowrap}.status-cell.focus{min-width:10rem}.status-help{margin-left:auto;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.library-window{height:100%;overflow:auto;background:#d7d7d7}.library-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:2px solid #111;background:#c6c6c6}.library-head h2{margin:.25rem 0 0;font-size:1rem;letter-spacing:.04em}.library-head p{max-width:42rem;margin:0;color:#555;font-size:.58rem;line-height:1.5}.library-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:1px;padding:1px;background:#777}.book-card{position:relative;display:grid;grid-template-rows:12rem auto;width:100%;min-width:0;padding:.8rem;border:0;background:#e4e4e4;text-align:left;cursor:pointer}.book-card:hover,.book-card:focus-visible{z-index:2;outline:2px dotted #111;outline-offset:-6px;background:#fff}.book-cover{position:relative;place-self:center;width:7.2rem;height:10.8rem;overflow:hidden;border:1px solid #111;background:var(--cloth,#263239);box-shadow:-5px 4px 0 color-mix(in srgb,var(--cloth,#263239) 62%,#000),7px 8px 0 rgba(0,0,0,.17)}.book-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.book-cover-fallback{position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto;padding:.7rem;color:var(--foil,#f4e8cc);background:linear-gradient(135deg,rgba(255,255,255,.12),transparent 35%),var(--cloth,#263239)}.book-cover-fallback i{width:1.1rem;height:1.1rem;border:1px solid currentColor;transform:rotate(45deg)}.book-cover-fallback strong{align-self:center;font:600 .66rem/1.1 Georgia,\"Times New Roman\",serif}.book-cover-fallback small{font-size:.42rem;text-transform:uppercase}.book-copy{padding-top:.85rem}.book-copy strong{display:block;font-size:.65rem;line-height:1.3}.book-copy span{display:block;margin-top:.3rem;color:#555;font-size:.52rem;line-height:1.35}.book-layers{display:flex;gap:.2rem;flex-wrap:wrap;margin-top:.5rem}.book-layers b{padding:.16rem .25rem;border:1px solid #777;background:#d4d4d4;color:#333;font-size:.44rem}\n.load-screen{position:absolute;z-index:50;inset:0;display:grid;place-items:center;background:#c6c6c6;transition:opacity .18s ease}.load-screen.done{display:none}.load-box{width:min(32rem,calc(100% - 3rem));padding:.8rem;border:2px solid;border-color:#fff #333 #333 #fff;background:#dedede;box-shadow:4px 4px #111}.load-title{display:flex;align-items:center;justify-content:space-between;padding:.35rem .45rem;background:#001d67;color:#fff;font-size:.6rem;font-weight:850;letter-spacing:.08em}.care-wire{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem;padding:2.1rem .8rem 1.4rem}.care-wire::before{content:\"\";position:absolute;left:12%;right:12%;top:50%;border-top:2px solid #555}.wire-node{position:relative;z-index:1;display:grid;place-items:center;aspect-ratio:1;border:2px solid #111;background:#eee;font-size:.7rem;font-weight:900;box-shadow:3px 3px #777;animation:wire-pulse .8s steps(2,end) infinite}.wire-node:nth-child(2){animation-delay:.12s}.wire-node:nth-child(3){animation-delay:.24s}.wire-node:nth-child(4){animation-delay:.36s}.load-caption{padding:.35rem;border:1px solid #777;background:#c9c9c9;font-size:.52rem;text-align:center}\n@keyframes wire-pulse{50%{background:#001d67;color:#fff;transform:translateY(-2px)}}\n@media(max-width:760px){.study-desk{min-height:43rem}.desk-title span,.desk-tabs{display:none}.desk-toolbar{gap:.4rem}.desk-nav{margin-left:auto}.desk-window,.desk-window.care-pane,.desk-window.inspector-pane{flex-basis:calc(100vw - 3.8rem);min-width:calc(100vw - 3.8rem)}.source-layout{grid-template-columns:1fr}.contents-rail{position:relative;height:auto;min-height:0;border-right:0;border-bottom:2px solid #777}.chapter-list{grid-template-columns:repeat(2,minmax(0,1fr));max-height:8rem;overflow:auto}.source-copy{padding:1.1rem 1rem 2.5rem}.status-help{display:none}.library-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.book-card{grid-template-rows:9rem auto;padding:.6rem}.book-cover{width:5.4rem;height:8.1rem}}\n@media(prefers-reduced-motion:reduce){.desk-window,.load-screen{transition:none}.wire-node{animation:none}.desk-strip{scroll-behavior:auto!important}}\n\n/* CARE Library treatment: quiet surfaces, typographic reading, exact colour rails. */\n:host{height:100%;--desk-bg:#ebe9e4;--desk-paper:#fbf8f1;--desk-ink:#202322;--desk-line:rgba(32,35,34,.14);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif)}\nbutton{border-radius:999px}\n.study-desk{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:calc(100dvh - 4.65rem);max-height:calc(100dvh - 4.65rem);min-height:0;border:1px solid rgba(32,35,34,.14);border-radius:22px;background:radial-gradient(circle at 82% -18%,rgba(181,111,59,.13),transparent 32rem),rgba(250,249,246,.76);box-shadow:0 22px 60px rgba(37,31,24,.09);isolation:isolate}\n/* The reader shell is a keyboard entry point, not a selected content card. */\n.study-desk:focus-visible{outline:none}\n.study-desk:focus-visible .status-cell.focus{box-shadow:inset 0 -2px #8ca9bd}\n.study-desk:focus-visible .desk-title strong{text-decoration:underline;text-decoration-color:#8ca9bd;text-underline-offset:4px;text-decoration-thickness:2px}\n.desk-toolbar{height:auto;min-height:4rem;gap:.65rem;padding:.62rem .78rem;border-bottom:1px solid rgba(32,35,34,.12);background:rgba(250,249,246,.9);box-shadow:none;backdrop-filter:blur(16px)}\n.desk-mark{width:2.15rem;height:2.15rem;border:0;border-radius:10px;background:#202322;font-family:var(--st-code-font,ui-monospace,monospace);font-size:.7rem}\n.desk-title strong{font:600 1rem/1.1 Georgia,\"Times New Roman\",serif;letter-spacing:-.01em}\n.desk-title span{margin-top:.28rem;color:rgba(32,35,34,.58);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.63rem;letter-spacing:0}\n.desk-tabs{gap:.22rem}\n.desk-tab,.desk-arrow,.desk-action,.desk-text-size button{min-height:2rem;padding:.35rem .58rem;border:1px solid rgba(32,35,34,.13);border-radius:999px;background:rgba(255,255,255,.72);box-shadow:none;color:#333836;font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.6rem;font-weight:760;letter-spacing:.025em}\n.desk-tab:hover,.desk-arrow:hover,.desk-action:hover,.desk-text-size button:hover,.desk-tab:focus-visible,.desk-arrow:focus-visible,.desk-action:focus-visible,.desk-text-size button:focus-visible{outline:none;border-color:color-mix(in srgb,var(--st-primary-color,#b56f3b) 46%,transparent);background:#fff;box-shadow:0 4px 14px rgba(37,31,24,.07)}\n.desk-tab.active{border-color:color-mix(in srgb,var(--st-primary-color,#b56f3b) 48%,transparent);background:color-mix(in srgb,var(--st-primary-color,#b56f3b) 10%,#fff);color:#7b4829}\n.desk-nav{gap:.28rem}.desk-arrow{width:2rem;padding:0;font-size:.9rem}.desk-text-size{display:flex;gap:.2rem;padding-left:.2rem;border-left:1px solid rgba(32,35,34,.12)}.desk-text-size button{width:2rem;padding:0}.desk-text-size button:disabled{opacity:.34;cursor:not-allowed}\n.route-toolbar{gap:.42rem;margin-left:.1rem;padding:.3rem .42rem;border:1px solid rgba(181,111,59,.24);border-radius:999px;background:rgba(181,111,59,.09);color:#704224;font-family:var(--st-code-font,ui-monospace,monospace);font-size:.52rem;box-shadow:none}.route-toolbar button{display:grid;place-items:center;width:1.45rem;height:1.45rem;border:0;border-radius:50%;background:rgba(181,111,59,.14);color:#704224}.route-toolbar button:hover,.route-toolbar button:focus-visible{outline:none;background:rgba(181,111,59,.24)}\n.desk-strip{height:auto;min-height:0;gap:1rem;padding:1rem;scroll-padding:1rem;scrollbar-width:thin;scrollbar-color:rgba(32,35,34,.28) transparent;background:transparent;touch-action:pan-x pan-y}\n.desk-strip::-webkit-scrollbar{height:.55rem}.desk-strip::-webkit-scrollbar-track{border:0;background:transparent}.desk-strip::-webkit-scrollbar-thumb{border:0;border-radius:999px;background:rgba(32,35,34,.24)}\n.desk-window{flex-basis:min(48rem,calc(100vw - 7rem));min-width:34rem;min-height:0;border:1px solid rgba(32,35,34,.14);border-radius:18px;background:rgba(255,255,255,.82);box-shadow:0 14px 38px rgba(37,31,24,.08);transition:opacity .18s ease,transform .18s ease}\n.desk-window.care-pane{flex-basis:min(35rem,calc(100vw - 7rem));min-width:28rem}.desk-window:not(.pane-focused){filter:none;opacity:.82}.desk-window.pane-focused{opacity:1;box-shadow:0 18px 48px rgba(37,31,24,.11)}\n.window-titlebar{height:2.7rem;padding:.45rem .75rem;border:0;border-top:4px solid var(--pane-accent);border-bottom:1px solid rgba(32,35,34,.1);background:color-mix(in srgb,var(--pane-accent) 7%,#fff);color:#242826}\n.window-titlebar strong{font-family:var(--st-code-font,ui-monospace,monospace);font-size:.62rem;letter-spacing:.085em}.window-titlebar span{padding:.2rem .44rem;border:1px solid color-mix(in srgb,var(--pane-accent) 28%,transparent);border-radius:999px;background:color-mix(in srgb,var(--pane-accent) 6%,#fff);color:var(--pane-accent);font-family:var(--st-code-font,ui-monospace,monospace);font-size:.5rem}\n.window-body{height:calc(100% - 2.7rem);min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;background:rgba(255,255,255,.7);scrollbar-width:thin;scrollbar-color:rgba(32,35,34,.24) transparent}\n.source-layout{grid-template-columns:12.5rem minmax(0,1fr)}\n.contents-rail{padding:1rem .8rem;border-right:1px solid rgba(32,35,34,.1);background:rgba(32,35,34,.035)}\n.rail-label,.pane-kicker,.section-number,.trace-label{color:rgba(32,35,34,.56);font-family:var(--st-code-font,ui-monospace,monospace);font-size:.52rem;letter-spacing:.13em}\n.contents-rail h3{margin:.48rem 0 .85rem;font:600 .92rem/1.2 Georgia,\"Times New Roman\",serif}\n.chapter-list{gap:.38rem}.chapter-button{padding:.62rem .58rem;border:1px solid rgba(32,35,34,.11);border-radius:11px;background:rgba(255,255,255,.58);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.61rem}.chapter-button:hover,.chapter-button:focus-visible{outline:none;border-color:rgba(181,111,59,.45);background:#fff}.chapter-button.active{border:1px solid rgba(181,111,59,.55);background:rgba(181,111,59,.1);box-shadow:inset 3px 0 #b56f3b}.chapter-button small{font-size:.5rem}\n.source-copy{padding:1.65rem 1.9rem 3rem;background:var(--desk-paper)}\n.source-head{margin-bottom:1.4rem;padding-bottom:1.15rem;border-bottom:1px solid rgba(91,75,56,.18)}.source-head h2{font-size:clamp(1.65rem,3vw,2.55rem)}\n/* Reserve the highlight gutter in every state so selecting a passage never shifts its text. */\n.passage{padding:1.1rem 1.25rem 1.45rem;border-top:1px solid rgba(78,64,47,.14);border-radius:0}.passage:hover,.passage:focus-visible{outline:none;background:rgba(181,111,59,.05)}.passage.selected{border-radius:10px;background:linear-gradient(90deg,rgba(181,111,59,.13),rgba(181,111,59,.025) 62%,transparent);box-shadow:inset 3px 0 #b56f3b}\n.passage-address{color:#a15f32}.passage-text{font-size:calc(1.04rem * var(--desk-text-scale,1));line-height:1.8}.passage-link{padding:.3rem .48rem;border:1px solid rgba(181,111,59,.28);border-radius:999px;background:rgba(181,111,59,.08);color:#824b27}\n.care-head{padding:1.2rem 1.15rem 1rem;border-bottom:1px solid rgba(32,35,34,.1);background:color-mix(in srgb,var(--pane-accent) 4%,#fff)}.care-head h2{font:600 calc(1.15rem * var(--desk-text-scale,1))/1.25 Georgia,\"Times New Roman\",serif;letter-spacing:-.01em}.care-head p{font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.64rem}.layer-route{gap:.3rem;margin-top:.8rem;font-family:var(--st-code-font,ui-monospace,monospace);font-size:.48rem}.layer-route b{padding:.2rem .38rem;border:1px solid rgba(32,35,34,.12);border-radius:999px;background:rgba(255,255,255,.7)}\n.route-focus{padding:.9rem;background:linear-gradient(135deg,color-mix(in srgb,var(--pane-accent) 4%,#fff),#fbfaf7)}\n.route-focus-head{margin-bottom:.8rem;padding:.85rem;border:1px solid color-mix(in srgb,var(--pane-accent) 25%,transparent);border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--pane-accent) 11%,#fff),#fff);box-shadow:none}.route-focus-head strong{font:600 calc(.86rem * var(--desk-text-scale,1))/1.36 Georgia,\"Times New Roman\",serif}.route-focus-head span{color:rgba(32,35,34,.58);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.56rem}.route-close{min-width:0;padding:.42rem .62rem;border:1px solid rgba(32,35,34,.13);border-radius:999px;background:rgba(255,255,255,.76);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.54rem}.route-close:hover,.route-close:focus-visible{outline:none;border-color:color-mix(in srgb,var(--pane-accent) 45%,transparent);background:#fff}\n.route-sheet{margin-bottom:.75rem;border:1px solid rgba(32,35,34,.11);border-radius:14px;background:rgba(255,255,255,.62);overflow:hidden}.route-sheet h3{padding:.58rem .68rem;border-bottom:1px solid rgba(32,35,34,.1);background:color-mix(in srgb,var(--pane-accent) 4%,#fff);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.61rem}.route-sheet h3 b{min-width:1.35rem;padding:.18rem .35rem;border-radius:999px;background:color-mix(in srgb,var(--pane-accent) 12%,#fff);color:var(--pane-accent);text-align:center}.route-list{gap:.45rem;padding:.5rem;background:transparent}.route-card{padding:.78rem .82rem;border:1px solid rgba(32,35,34,.1);border-radius:12px;background:rgba(255,255,255,.8)}.route-card:hover,.route-card:focus-visible{outline:none;border-color:color-mix(in srgb,var(--pane-accent) 40%,transparent);background:#fff}.route-card.selected{border-color:color-mix(in srgb,var(--pane-accent) 56%,transparent);background:color-mix(in srgb,var(--pane-accent) 9%,#fff);box-shadow:inset 3px 0 var(--pane-accent),0 7px 22px rgba(37,31,24,.06)}.route-card-text{font:500 calc(.82rem * var(--desk-text-scale,1))/1.55 Georgia,\"Times New Roman\",serif}.route-card-via{color:color-mix(in srgb,var(--pane-accent) 70%,#555);font-family:var(--st-code-font,ui-monospace,monospace)}\n.route-empty{border:1px dashed rgba(32,35,34,.18);border-radius:12px;background:rgba(255,255,255,.55)}.route-selected-note{margin:.85rem;padding:.78rem;border:1px solid color-mix(in srgb,var(--pane-accent) 25%,transparent);border-radius:12px;background:color-mix(in srgb,var(--pane-accent) 7%,#fff);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.58rem}.route-source-copy{gap:.8rem;padding:1rem;background:var(--desk-paper)}.route-source-card{padding:1.1rem;border:1px solid rgba(91,75,56,.17);border-radius:14px;background:rgba(255,255,255,.72)}.route-source-card:hover,.route-source-card:focus-visible{outline:none;border-color:rgba(181,111,59,.5);box-shadow:0 10px 28px rgba(37,31,24,.07)}.route-source-card.selected{box-shadow:inset 3px 0 #b56f3b}\n.care-sections{padding:.85rem}.care-section{margin:0 0 .7rem;border:1px solid rgba(32,35,34,.11);border-radius:14px;background:rgba(255,255,255,.62);overflow:hidden}.care-section>summary{padding:.68rem .72rem;background:color-mix(in srgb,var(--pane-accent) 3.5%,#fff);font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif);font-size:.66rem}.care-section>summary::before{width:1.25rem;height:1.25rem;border:1px solid color-mix(in srgb,var(--pane-accent) 24%,transparent);border-radius:50%;background:rgba(255,255,255,.72);color:var(--pane-accent)}.axiom-list{gap:.45rem;padding:.5rem;background:transparent}.axiom-button{padding:.82rem .86rem .9rem;border:1px solid rgba(32,35,34,.09);border-radius:12px;background:rgba(255,255,255,.78)}.axiom-button:hover,.axiom-button:focus-visible{outline:none;border-color:color-mix(in srgb,var(--pane-accent) 38%,transparent);background:#fff}.axiom-button.selected{border-color:color-mix(in srgb,var(--pane-accent) 58%,transparent);background:color-mix(in srgb,var(--pane-accent) 9%,#fff);box-shadow:inset 3px 0 var(--pane-accent),0 9px 24px rgba(37,31,24,.06)}.axiom-text{font:500 calc(.84rem * var(--desk-text-scale,1))/1.58 Georgia,\"Times New Roman\",serif}.axiom-trace{color:rgba(32,35,34,.5);font-family:var(--st-code-font,ui-monospace,monospace)}\n.desk-status{height:auto;min-height:1.9rem;padding:.32rem .7rem;border-top:1px solid rgba(32,35,34,.1);background:rgba(250,249,246,.82);font-family:var(--st-code-font,ui-monospace,monospace);font-size:.48rem}.status-cell{padding:.23rem .42rem;border:0;border-radius:999px;background:rgba(32,35,34,.055)}.status-help{color:rgba(32,35,34,.5)}\n.library-window{height:100%;background:transparent}.library-head{padding:1.2rem 1.3rem;border-bottom:1px solid rgba(32,35,34,.1);background:rgba(255,255,255,.5)}.library-head h2{font:600 1.55rem/1.1 Georgia,\"Times New Roman\",serif;letter-spacing:-.02em}.library-head p{font-size:.68rem}.library-grid{grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:1rem;padding:1rem;background:transparent}.book-card{grid-template-rows:12rem auto;padding:1rem;border:1px solid rgba(32,35,34,.1);border-radius:16px;background:rgba(255,255,255,.62)}.book-card:hover,.book-card:focus-visible{outline:none;border-color:rgba(181,111,59,.4);background:#fff;box-shadow:0 15px 36px rgba(37,31,24,.09);transform:translateY(-2px)}.book-cover{border:0;border-radius:3px 9px 9px 3px;box-shadow:-4px 4px 0 color-mix(in srgb,var(--cloth,#263239) 62%,#000),7px 10px 22px rgba(0,0,0,.18)}.book-copy strong{font:600 .82rem/1.3 Georgia,\"Times New Roman\",serif}.book-copy span{font-size:.56rem}.book-layers b{border:0;border-radius:999px;background:rgba(32,35,34,.055)}\n.load-screen{border-radius:inherit;background:rgba(235,233,228,.96);backdrop-filter:blur(12px)}.load-box{padding:1.05rem;border:1px solid rgba(32,35,34,.12);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 24px 65px rgba(37,31,24,.12)}.load-title{padding:.35rem;background:transparent;color:#202322}.care-wire::before{border-color:rgba(32,35,34,.18)}.wire-node{border:1px solid rgba(32,35,34,.16);border-radius:50%;background:#fff;box-shadow:0 7px 18px rgba(37,31,24,.08)}.load-caption{border:0;border-radius:999px;background:rgba(32,35,34,.045)}\n@keyframes wire-pulse{50%{background:color-mix(in srgb,var(--st-primary-color,#b56f3b) 12%,#fff);color:#7b4829;transform:translateY(-2px)}}\n@media(max-width:760px){.study-desk{min-height:0;border-radius:14px}.desk-title span,.desk-tabs{display:none}.desk-toolbar{min-height:3.65rem}.desk-text-size{margin-left:auto}.desk-nav{margin-left:0}.desk-window,.desk-window.care-pane{flex-basis:calc(100vw - 3rem);min-width:calc(100vw - 3rem)}.contents-rail{border-right:0;border-bottom:1px solid rgba(32,35,34,.1)}}\n\n/* Three preserved visual languages: CARE dark, Book paper, and Classic utility. */\n.desk-skin{display:flex;align-items:center;gap:.18rem;padding:.16rem;border:1px solid rgba(32,35,34,.12);border-radius:999px;background:rgba(255,255,255,.5)}\n.desk-skin>span{padding:0 .22rem 0 .3rem;color:rgba(32,35,34,.48);font:800 .42rem/1 var(--st-code-font,ui-monospace,monospace);letter-spacing:.09em}\n.desk-skin button{min-height:1.65rem;padding:.24rem .42rem;border:0;border-radius:999px;background:transparent;color:rgba(32,35,34,.58);cursor:pointer;font:800 .48rem/1 var(--st-code-font,ui-monospace,monospace);letter-spacing:.04em}\n.desk-skin button.active{background:#202322;color:#fff;box-shadow:0 3px 9px rgba(37,31,24,.14)}\n\n/* Book skin: cloth, paper, copper, and strong layer colour. */\n.study-desk[data-skin=\"library\"]{\n  --desk-paper:#f5eddf;\n  --desk-ink:#2a251f;\n  border-color:rgba(63,43,29,.28);\n  border-radius:26px;\n  background:\n    radial-gradient(circle at 10% -18%,rgba(181,111,59,.2),transparent 29rem),\n    linear-gradient(180deg,#9b7b5f,#87674f);\n  box-shadow:0 1.8rem 4.8rem rgba(39,23,13,.2),inset 0 1px rgba(255,255,255,.17);\n}\n.study-desk[data-skin=\"library\"] .desk-toolbar{\n  min-height:4.25rem;\n  padding:.68rem .82rem;\n  border-bottom:1px solid rgba(234,207,171,.14);\n  background:\n    radial-gradient(circle at 7% 0,rgba(181,111,59,.18),transparent 24rem),\n    linear-gradient(180deg,#211913,#17110d);\n  color:#eee3d0;\n  box-shadow:0 .7rem 1.8rem rgba(41,24,14,.2);\n}\n.study-desk[data-skin=\"library\"] .desk-mark{border:1px solid rgba(210,154,102,.55);border-radius:11px;background:#b56f3b;color:#fff7eb;box-shadow:0 .4rem 1rem rgba(0,0,0,.22)}\n.study-desk[data-skin=\"library\"] .desk-title strong{color:#f4ead9;font:500 1.08rem/1.08 Georgia,\"Times New Roman\",serif}\n.study-desk[data-skin=\"library\"] .desk-title span{color:rgba(238,227,208,.56)}\n.study-desk[data-skin=\"library\"] .desk-tab,\n.study-desk[data-skin=\"library\"] .desk-arrow,\n.study-desk[data-skin=\"library\"] .desk-text-size button{\n  border-color:rgba(210,154,102,.24);\n  background:rgba(210,154,102,.07);\n  color:#d9c5ad;\n}\n.study-desk[data-skin=\"library\"] .desk-tab:hover,\n.study-desk[data-skin=\"library\"] .desk-arrow:hover,\n.study-desk[data-skin=\"library\"] .desk-text-size button:hover,\n.study-desk[data-skin=\"library\"] .desk-tab:focus-visible,\n.study-desk[data-skin=\"library\"] .desk-arrow:focus-visible,\n.study-desk[data-skin=\"library\"] .desk-text-size button:focus-visible{border-color:#d29a66;background:rgba(210,154,102,.15);color:#fff0dc;box-shadow:none}\n.study-desk[data-skin=\"library\"] .desk-tab.active{border-color:rgba(210,154,102,.62);background:#b56f3b;color:#fff8ed;box-shadow:0 .3rem .9rem rgba(0,0,0,.19)}\n.study-desk[data-skin=\"library\"] .desk-text-size{border-left-color:rgba(234,207,171,.16)}\n.study-desk[data-skin=\"library\"] .desk-skin{border-color:rgba(210,154,102,.25);background:rgba(6,4,3,.28)}\n.study-desk[data-skin=\"library\"] .desk-skin>span{color:rgba(238,227,208,.48)}\n.study-desk[data-skin=\"library\"] .desk-skin button{color:#cdb9a2}\n.study-desk[data-skin=\"library\"] .desk-skin button.active{background:#d29a66;color:#251810}\n.study-desk[data-skin=\"library\"] .route-toolbar{border-color:rgba(210,154,102,.34);background:rgba(210,154,102,.12);color:#f0d3ad}\n.study-desk[data-skin=\"library\"] .route-toolbar button{background:rgba(210,154,102,.17);color:#f2ddc4}\n.study-desk[data-skin=\"library\"] .desk-strip{\n  gap:1.15rem;\n  padding:1.15rem;\n  scroll-padding:1.15rem;\n  background:\n    linear-gradient(90deg,rgba(255,255,255,.018),transparent 22%,rgba(0,0,0,.035) 55%,transparent),\n    repeating-linear-gradient(92deg,rgba(73,44,26,.04) 0 1px,transparent 1px 9px),\n    linear-gradient(180deg,#86684f,#9b7b5f 52%,#88684f);\n  box-shadow:inset 0 1.35rem 2.8rem rgba(36,21,12,.18),inset 0 -1.8rem 3.7rem rgba(45,24,13,.2);\n  scrollbar-color:rgba(238,227,208,.35) transparent;\n}\n.study-desk[data-skin=\"library\"] .desk-window{\n  border:1px solid rgba(65,45,31,.31);\n  border-radius:18px 24px 24px 18px;\n  background:#f8f2e7;\n  box-shadow:-.3rem .32rem 0 color-mix(in srgb,var(--pane-accent) 32%,#2d2018),.7rem 1.15rem 2.1rem rgba(35,19,10,.3);\n}\n.study-desk[data-skin=\"library\"] .desk-window:not(.pane-focused){opacity:.9;filter:saturate(.86)}\n.study-desk[data-skin=\"library\"] .desk-window.pane-focused{opacity:1;filter:none;box-shadow:-.34rem .36rem 0 color-mix(in srgb,var(--pane-accent) 42%,#241812),.9rem 1.4rem 2.8rem rgba(32,17,9,.38)}\n.study-desk[data-skin=\"library\"] .window-titlebar{\n  height:2.85rem;\n  padding:.52rem .78rem;\n  border:0;\n  border-bottom:1px solid rgba(0,0,0,.18);\n  background:linear-gradient(90deg,var(--pane-accent),color-mix(in srgb,var(--pane-accent) 76%,#17110d));\n  color:#fffaf2;\n  box-shadow:inset 0 1px rgba(255,255,255,.12);\n}\n.study-desk[data-skin=\"library\"] .window-titlebar strong{font-size:.64rem;letter-spacing:.105em}\n.study-desk[data-skin=\"library\"] .window-titlebar span{border-color:rgba(255,255,255,.3);background:rgba(0,0,0,.12);color:#fff6e8}\n.study-desk[data-skin=\"library\"] .window-body{height:calc(100% - 2.85rem);background:#f8f2e7;scrollbar-color:rgba(78,54,37,.35) transparent}\n.study-desk[data-skin=\"library\"] .contents-rail{border-right:1px solid rgba(234,207,171,.13);background:linear-gradient(180deg,#2b211a,#1c1510);color:#eadfce}\n.study-desk[data-skin=\"library\"] .contents-rail .rail-label{color:#d29a66}\n.study-desk[data-skin=\"library\"] .contents-rail h3{color:#f2e7d5;font-size:1rem}\n.study-desk[data-skin=\"library\"] .chapter-button{border-color:rgba(210,154,102,.17);background:rgba(255,255,255,.045);color:#d5c6b2}\n.study-desk[data-skin=\"library\"] .chapter-button small{color:rgba(234,223,206,.45)}\n.study-desk[data-skin=\"library\"] .chapter-button:hover,\n.study-desk[data-skin=\"library\"] .chapter-button:focus-visible{border-color:rgba(210,154,102,.55);background:rgba(210,154,102,.11);color:#fff0dc}\n.study-desk[data-skin=\"library\"] .chapter-button.active{border-color:#d29a66;background:rgba(181,111,59,.24);color:#fff4e4;box-shadow:inset 3px 0 #d29a66}\n.study-desk[data-skin=\"library\"] .source-copy{background:linear-gradient(90deg,#e7dac4 0,#f7eedf 4%,#f8f1e6 100%)}\n.study-desk[data-skin=\"library\"] .source-head{border-bottom-color:rgba(99,66,39,.2)}\n.study-desk[data-skin=\"library\"] .passage{border-top-color:rgba(91,59,35,.14)}\n.study-desk[data-skin=\"library\"] .passage:hover,\n.study-desk[data-skin=\"library\"] .passage:focus-visible{background:rgba(181,111,59,.065)}\n.study-desk[data-skin=\"library\"] .care-head{position:relative;padding:1.35rem 1.2rem 1.15rem;border-top:1px solid color-mix(in srgb,var(--pane-accent) 35%,transparent);border-bottom:1px solid color-mix(in srgb,var(--pane-accent) 20%,transparent);background:radial-gradient(circle at 88% 0,color-mix(in srgb,var(--pane-accent) 13%,transparent),transparent 16rem),#faf6ee}\n.study-desk[data-skin=\"library\"] .care-head::after{content:\"\";position:absolute;right:0;bottom:-1px;width:42%;height:1px;background:linear-gradient(90deg,transparent,var(--pane-accent))}\n.study-desk[data-skin=\"library\"] .care-head .pane-kicker{color:color-mix(in srgb,var(--pane-accent) 72%,#362a21)}\n.study-desk[data-skin=\"library\"] .care-head h2{font-size:calc(1.28rem * var(--desk-text-scale,1));color:#2d2822}\n.study-desk[data-skin=\"library\"] .layer-route b{border-color:color-mix(in srgb,var(--pane-accent) 25%,transparent);background:color-mix(in srgb,var(--pane-accent) 7%,#fff);color:var(--pane-accent)}\n.study-desk[data-skin=\"library\"] .care-sections{padding:1rem;background:#faf7f1}\n.study-desk[data-skin=\"library\"] .care-section{margin-bottom:.85rem;border-color:color-mix(in srgb,var(--pane-accent) 20%,transparent);border-radius:12px;background:#fffdf8;box-shadow:0 .45rem 1.2rem rgba(49,34,24,.055)}\n.study-desk[data-skin=\"library\"] .care-section>summary{min-height:2.65rem;padding:.66rem .78rem;background:linear-gradient(90deg,var(--pane-accent),color-mix(in srgb,var(--pane-accent) 82%,#19130f));color:#fffaf2;font-size:.67rem;letter-spacing:.06em;text-transform:uppercase}\n.study-desk[data-skin=\"library\"] .care-section>summary::before{border-color:rgba(255,255,255,.34);background:rgba(255,255,255,.1);color:#fff}\n.study-desk[data-skin=\"library\"] .care-section>summary small{color:rgba(255,255,255,.68)}\n.study-desk[data-skin=\"library\"] .axiom-list{gap:0;padding:0;background:#fffdf8}\n.study-desk[data-skin=\"library\"] .axiom-button{position:relative;padding:1.05rem 1.05rem 1.12rem;border:0;border-radius:0;background:transparent}\n.study-desk[data-skin=\"library\"] .axiom-button+.axiom-button{border-top:1px solid rgba(84,67,52,.13)}\n.study-desk[data-skin=\"library\"] .axiom-button:hover,\n.study-desk[data-skin=\"library\"] .axiom-button:focus-visible{background:color-mix(in srgb,var(--pane-accent) 4%,#fffdf8)}\n.study-desk[data-skin=\"library\"] .axiom-button.selected{border:0;background:color-mix(in srgb,var(--pane-accent) 8%,#fff9ef);box-shadow:inset 3px 0 var(--pane-accent)}\n.study-desk[data-skin=\"library\"] .axiom-button.selected::after{content:\"\";position:absolute;left:0;top:18%;bottom:18%;width:2px;background:var(--pane-accent);box-shadow:0 0 12px color-mix(in srgb,var(--pane-accent) 42%,transparent)}\n.study-desk[data-skin=\"library\"] .axiom-id{font-size:.54rem;letter-spacing:.03em}\n.study-desk[data-skin=\"library\"] .axiom-text{font-size:calc(.91rem * var(--desk-text-scale,1));line-height:1.64;color:#312c26}\n.study-desk[data-skin=\"library\"] .route-focus{background:linear-gradient(90deg,#eee1cc,#faf4e8 7%,#faf7f1)}\n.study-desk[data-skin=\"library\"] .route-focus-head{border-color:color-mix(in srgb,var(--pane-accent) 32%,transparent);background:radial-gradient(circle at 94% 0,color-mix(in srgb,var(--pane-accent) 15%,transparent),transparent 12rem),#fffaf1}\n.study-desk[data-skin=\"library\"] .route-sheet{border-color:color-mix(in srgb,var(--pane-accent) 20%,transparent);background:#fffdf8}\n.study-desk[data-skin=\"library\"] .route-sheet h3{background:linear-gradient(90deg,var(--pane-accent),color-mix(in srgb,var(--pane-accent) 82%,#19130f));color:#fffaf2;letter-spacing:.05em;text-transform:uppercase}\n.study-desk[data-skin=\"library\"] .route-sheet h3 b{background:rgba(255,255,255,.13);color:#fff}\n.study-desk[data-skin=\"library\"] .route-list{gap:0;padding:0;background:#fffdf8}\n.study-desk[data-skin=\"library\"] .route-card{padding:1rem;border:0;border-radius:0;background:transparent}\n.study-desk[data-skin=\"library\"] .route-card+.route-card{border-top:1px solid rgba(84,67,52,.13)}\n.study-desk[data-skin=\"library\"] .route-card:hover,\n.study-desk[data-skin=\"library\"] .route-card:focus-visible{background:color-mix(in srgb,var(--pane-accent) 4%,#fffdf8)}\n.study-desk[data-skin=\"library\"] .route-card.selected{border:0;background:color-mix(in srgb,var(--pane-accent) 8%,#fff9ef);box-shadow:inset 3px 0 var(--pane-accent)}\n.study-desk[data-skin=\"library\"] .route-selected-note{border-color:color-mix(in srgb,var(--pane-accent) 30%,transparent);background:color-mix(in srgb,var(--pane-accent) 8%,#fff7e7)}\n.study-desk[data-skin=\"library\"] .desk-status{border-top:1px solid rgba(234,207,171,.13);background:#18120e;color:#cdbba4}\n.study-desk[data-skin=\"library\"] .status-cell{background:rgba(210,154,102,.1);color:#dcc6ab}\n.study-desk[data-skin=\"library\"] .status-help{color:rgba(238,227,208,.48)}\n.study-desk[data-skin=\"library\"] .load-screen{background:rgba(24,18,14,.96)}\n.study-desk[data-skin=\"library\"] .load-box{border-color:rgba(210,154,102,.25);background:#211913;color:#eee3d0}\n\n/* CARE skin: the quiet dark library language used by the advanced studio. */\n.study-desk[data-skin=\"care\"]{\n  --desk-paper:#171916;\n  --desk-ink:#eee9df;\n  border-color:rgba(210,154,102,.2);\n  border-radius:22px;\n  color:#eee9df;\n  background:\n    radial-gradient(circle at 82% -12%,rgba(32,95,77,.17),transparent 31rem),\n    radial-gradient(circle at 8% 0,rgba(181,111,59,.14),transparent 26rem),\n    #0b0e0d;\n  box-shadow:0 1.8rem 5rem rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.035);\n}\n.study-desk[data-skin=\"care\"] .desk-toolbar{\n  min-height:4.15rem;\n  border-bottom-color:rgba(210,154,102,.14);\n  background:rgba(13,16,15,.95);\n  color:#ece6da;\n  box-shadow:0 .8rem 2rem rgba(0,0,0,.25);\n}\n.study-desk[data-skin=\"care\"] .desk-mark{border:1px solid rgba(210,154,102,.5);background:#181c1a;color:#f4ede2;box-shadow:inset 0 0 0 3px rgba(181,111,59,.12)}\n.study-desk[data-skin=\"care\"] .desk-title strong{color:#f2ece1}\n.study-desk[data-skin=\"care\"] .desk-title span{color:rgba(238,233,223,.5)}\n.study-desk[data-skin=\"care\"] .desk-tab,\n.study-desk[data-skin=\"care\"] .desk-arrow,\n.study-desk[data-skin=\"care\"] .desk-text-size button{border-color:rgba(238,233,223,.13);background:rgba(255,255,255,.035);color:#c9c5bd}\n.study-desk[data-skin=\"care\"] .desk-tab:hover,\n.study-desk[data-skin=\"care\"] .desk-arrow:hover,\n.study-desk[data-skin=\"care\"] .desk-text-size button:hover,\n.study-desk[data-skin=\"care\"] .desk-tab:focus-visible,\n.study-desk[data-skin=\"care\"] .desk-arrow:focus-visible,\n.study-desk[data-skin=\"care\"] .desk-text-size button:focus-visible{border-color:rgba(210,154,102,.58);background:rgba(210,154,102,.09);color:#fff5e8;box-shadow:none}\n.study-desk[data-skin=\"care\"] .desk-tab.active{border-color:rgba(210,154,102,.55);background:#eee5d7;color:#171a18;box-shadow:0 .3rem .8rem rgba(0,0,0,.25)}\n.study-desk[data-skin=\"care\"] .desk-text-size{border-left-color:rgba(238,233,223,.11)}\n.study-desk[data-skin=\"care\"] .desk-skin{border-color:rgba(210,154,102,.2);background:rgba(255,255,255,.025)}\n.study-desk[data-skin=\"care\"] .desk-skin>span{color:rgba(238,233,223,.42)}\n.study-desk[data-skin=\"care\"] .desk-skin button{color:#aaa79f}\n.study-desk[data-skin=\"care\"] .desk-skin button.active{background:#eee5d7;color:#171a18;box-shadow:none}\n.study-desk[data-skin=\"care\"] .route-toolbar{border-color:rgba(210,154,102,.3);background:rgba(181,111,59,.1);color:#e1ba91}\n.study-desk[data-skin=\"care\"] .route-toolbar button{background:rgba(210,154,102,.14);color:#f4d7b8}\n.study-desk[data-skin=\"care\"] .desk-strip{background:linear-gradient(180deg,rgba(255,255,255,.018),transparent 22%),#0b0e0d;scrollbar-color:rgba(210,154,102,.34) transparent}\n.study-desk[data-skin=\"care\"] .desk-strip::-webkit-scrollbar-thumb{background:rgba(210,154,102,.3)}\n.study-desk[data-skin=\"care\"] .desk-window{border-color:rgba(238,233,223,.11);background:#151817;box-shadow:0 1rem 2.7rem rgba(0,0,0,.31)}\n.study-desk[data-skin=\"care\"] .desk-window:not(.pane-focused){opacity:.74}\n.study-desk[data-skin=\"care\"] .desk-window.pane-focused{opacity:1;box-shadow:0 1.35rem 3.4rem rgba(0,0,0,.42),0 0 0 1px color-mix(in srgb,var(--pane-accent) 28%,transparent)}\n.study-desk[data-skin=\"care\"] .window-titlebar{border-top-color:var(--pane-accent);border-bottom-color:rgba(255,255,255,.08);background:linear-gradient(90deg,color-mix(in srgb,var(--pane-accent) 72%,#101312),#111513 70%);color:#f5efe5}\n.study-desk[data-skin=\"care\"] .window-titlebar span{border-color:rgba(238,233,223,.18);background:rgba(0,0,0,.2);color:#eee7dc}\n.study-desk[data-skin=\"care\"] .window-body{background:#151817;color:#e9e4da;scrollbar-color:rgba(210,154,102,.31) transparent}\n.study-desk[data-skin=\"care\"] .contents-rail{border-right-color:rgba(210,154,102,.13);background:#101312;color:#e4dfd5}\n.study-desk[data-skin=\"care\"] .contents-rail .rail-label{color:#c68b58}\n.study-desk[data-skin=\"care\"] .contents-rail h3{color:#f0eadd}\n.study-desk[data-skin=\"care\"] .chapter-button{border-color:rgba(238,233,223,.09);background:rgba(255,255,255,.025);color:#c7c3bb}\n.study-desk[data-skin=\"care\"] .chapter-button small{color:rgba(238,233,223,.38)}\n.study-desk[data-skin=\"care\"] .chapter-button:hover,\n.study-desk[data-skin=\"care\"] .chapter-button:focus-visible{border-color:rgba(210,154,102,.42);background:rgba(181,111,59,.08);color:#fff4e7}\n.study-desk[data-skin=\"care\"] .chapter-button.active{border-color:rgba(210,154,102,.64);background:rgba(181,111,59,.14);color:#fff5e9;box-shadow:inset 3px 0 #c9854d}\n.study-desk[data-skin=\"care\"] .source-copy{background:linear-gradient(90deg,#101310,#171916 4%,#181a17);color:#eee9df}\n.study-desk[data-skin=\"care\"] .source-head{border-bottom-color:rgba(210,154,102,.16)}\n.study-desk[data-skin=\"care\"] .source-head h2{color:#f3eee4}\n.study-desk[data-skin=\"care\"] .source-head p{color:#aaa397}\n.study-desk[data-skin=\"care\"] .passage{border-top-color:rgba(238,233,223,.09);color:#e8e2d8}\n.study-desk[data-skin=\"care\"] .passage:hover,\n.study-desk[data-skin=\"care\"] .passage:focus-visible{background:rgba(181,111,59,.055)}\n.study-desk[data-skin=\"care\"] .passage.selected{background:linear-gradient(90deg,rgba(181,111,59,.16),transparent 66%)}\n.study-desk[data-skin=\"care\"] .passage-address{color:#cf915c}\n.study-desk[data-skin=\"care\"] .passage-link{border-color:rgba(210,154,102,.35);background:rgba(181,111,59,.12);color:#efc49f}\n.study-desk[data-skin=\"care\"] .care-head{border-bottom-color:rgba(238,233,223,.08);background:radial-gradient(circle at 90% 0,color-mix(in srgb,var(--pane-accent) 13%,transparent),transparent 15rem),#181c1a;color:#eae5dc}\n.study-desk[data-skin=\"care\"] .care-head h2{color:#f0ebe1}\n.study-desk[data-skin=\"care\"] .care-head p{color:#9e9c96}\n.study-desk[data-skin=\"care\"] .rail-label,\n.study-desk[data-skin=\"care\"] .pane-kicker,\n.study-desk[data-skin=\"care\"] .section-number,\n.study-desk[data-skin=\"care\"] .trace-label{color:#aaa8a1}\n.study-desk[data-skin=\"care\"] .layer-route{color:#777b77}\n.study-desk[data-skin=\"care\"] .layer-route b{border-color:color-mix(in srgb,var(--pane-accent) 35%,transparent);background:color-mix(in srgb,var(--pane-accent) 12%,#141816);color:color-mix(in srgb,var(--pane-accent) 72%,#ddd)}\n.study-desk[data-skin=\"care\"] .care-sections{background:#121514}\n.study-desk[data-skin=\"care\"] .care-section{border-color:rgba(238,233,223,.09);background:#171a18;box-shadow:0 .5rem 1.3rem rgba(0,0,0,.14)}\n.study-desk[data-skin=\"care\"] .care-section>summary{background:linear-gradient(90deg,color-mix(in srgb,var(--pane-accent) 72%,#111513),#171b19);color:#f1ece3}\n.study-desk[data-skin=\"care\"] .care-section>summary::before{border-color:rgba(238,233,223,.2);background:rgba(255,255,255,.04);color:#f0ebe2}\n.study-desk[data-skin=\"care\"] .care-section>summary small{color:rgba(238,233,223,.5)}\n.study-desk[data-skin=\"care\"] .axiom-list{background:#151817}\n.study-desk[data-skin=\"care\"] .axiom-button{border-color:rgba(238,233,223,.07);background:#171a18;color:#e6e1d7}\n.study-desk[data-skin=\"care\"] .axiom-button:hover,\n.study-desk[data-skin=\"care\"] .axiom-button:focus-visible{border-color:color-mix(in srgb,var(--pane-accent) 44%,transparent);background:#1d211f}\n.study-desk[data-skin=\"care\"] .axiom-button.selected{border-color:color-mix(in srgb,var(--pane-accent) 62%,transparent);background:color-mix(in srgb,var(--pane-accent) 15%,#171a18);box-shadow:inset 3px 0 color-mix(in srgb,var(--pane-accent) 74%,#eee)}\n.study-desk[data-skin=\"care\"] .axiom-id,\n.study-desk[data-skin=\"care\"] .route-card-id,\n.study-desk[data-skin=\"care\"] .inspect-id,\n.study-desk[data-skin=\"care\"] .trace-card strong{color:color-mix(in srgb,var(--pane-accent) 70%,#e8dfd2)}\n.study-desk[data-skin=\"care\"] .axiom-text{color:#e7e1d7}\n.study-desk[data-skin=\"care\"] .axiom-trace{color:rgba(238,233,223,.38)}\n.study-desk[data-skin=\"care\"] .route-focus{background:linear-gradient(135deg,color-mix(in srgb,var(--pane-accent) 8%,#111513),#111413)}\n.study-desk[data-skin=\"care\"] .route-focus-head{border-color:color-mix(in srgb,var(--pane-accent) 35%,transparent);background:color-mix(in srgb,var(--pane-accent) 9%,#191d1b);color:#e9e4db}\n.study-desk[data-skin=\"care\"] .route-focus-head span{color:#aaa79f}\n.study-desk[data-skin=\"care\"] .route-close{border-color:rgba(238,233,223,.13);background:#232825;color:#e9e3d9}\n.study-desk[data-skin=\"care\"] .route-close:hover,\n.study-desk[data-skin=\"care\"] .route-close:focus-visible{background:#2a302d;color:#fff}\n.study-desk[data-skin=\"care\"] .route-sheet{border-color:rgba(238,233,223,.09);background:#151817}\n.study-desk[data-skin=\"care\"] .route-sheet h3{border-bottom-color:rgba(238,233,223,.08);background:color-mix(in srgb,var(--pane-accent) 10%,#171a18);color:#eae5dc}\n.study-desk[data-skin=\"care\"] .route-sheet h3 b{background:color-mix(in srgb,var(--pane-accent) 22%,#151817);color:#eee8de}\n.study-desk[data-skin=\"care\"] .route-list{background:#131614}\n.study-desk[data-skin=\"care\"] .route-card{border-color:rgba(238,233,223,.08);background:#191c1a;color:#e6e1d7}\n.study-desk[data-skin=\"care\"] .route-card:hover,\n.study-desk[data-skin=\"care\"] .route-card:focus-visible{background:#202522}\n.study-desk[data-skin=\"care\"] .route-card.selected{background:color-mix(in srgb,var(--pane-accent) 14%,#191c1a)}\n.study-desk[data-skin=\"care\"] .route-card-via{color:#8e908b}\n.study-desk[data-skin=\"care\"] .route-empty,\n.study-desk[data-skin=\"care\"] .route-selected-note{border-color:rgba(238,233,223,.12);background:#191d1b;color:#aaa8a1}\n.study-desk[data-skin=\"care\"] .route-source-copy{background:#131613}\n.study-desk[data-skin=\"care\"] .route-source-card{border-color:rgba(238,233,223,.1);background:#191c18;color:#ebe5da}\n.study-desk[data-skin=\"care\"] .inspector-empty{background:#111413;color:#e9e4da}\n.study-desk[data-skin=\"care\"] .inspector-empty>div{border:1px solid rgba(238,233,223,.12);background:#191d1b;box-shadow:none}\n.study-desk[data-skin=\"care\"] .inspector-empty p{color:#9d9d97}\n.study-desk[data-skin=\"care\"] .inspector-content{background:#131614;color:#eae5dc}\n.study-desk[data-skin=\"care\"] .inspect-text{border-color:rgba(238,233,223,.11);background:#1a1e1b;color:#e8e2d8;box-shadow:none}\n.study-desk[data-skin=\"care\"] .inspect-meta{color:#979994}\n.study-desk[data-skin=\"care\"] .rating-box,\n.study-desk[data-skin=\"care\"] .trace-group{border-color:rgba(238,233,223,.1);background:#171a18}\n.study-desk[data-skin=\"care\"] .star{border:1px solid rgba(238,233,223,.13);background:#202421;color:#aaa79f}\n.study-desk[data-skin=\"care\"] .star.active{border-color:rgba(210,154,102,.5);background:#b56f3b;color:#fff0bd}\n.study-desk[data-skin=\"care\"] .trace-group h4{border-bottom-color:rgba(238,233,223,.08);background:#1b1f1d;color:#e5e0d7}\n.study-desk[data-skin=\"care\"] .trace-group h4 b{background:rgba(238,233,223,.1);color:#e9e3d9}\n.study-desk[data-skin=\"care\"] .trace-list{background:#111413}\n.study-desk[data-skin=\"care\"] .trace-card{background:#191c1a;color:#e4dfd6}\n.study-desk[data-skin=\"care\"] .trace-card:hover,\n.study-desk[data-skin=\"care\"] .trace-card:focus-visible{background:#222724}\n.study-desk[data-skin=\"care\"] .trace-empty{background:#171a18;color:#92948f}\n.study-desk[data-skin=\"care\"] .desk-status{border-top-color:rgba(238,233,223,.09);background:#0e1110;color:#aaa79f}\n.study-desk[data-skin=\"care\"] .status-cell{background:rgba(238,233,223,.055);color:#c6c2ba}\n.study-desk[data-skin=\"care\"] .status-help{color:rgba(238,233,223,.38)}\n.study-desk[data-skin=\"care\"] .library-window{background:#101312;color:#eae5dc}\n.study-desk[data-skin=\"care\"] .library-head{border-bottom-color:rgba(238,233,223,.08);background:#151817}\n.study-desk[data-skin=\"care\"] .library-head p{color:#9d9e99}\n.study-desk[data-skin=\"care\"] .library-grid{background:#101312}\n.study-desk[data-skin=\"care\"] .book-card{border-color:rgba(238,233,223,.09);background:#171a18;color:#e8e3da}\n.study-desk[data-skin=\"care\"] .book-card:hover,\n.study-desk[data-skin=\"care\"] .book-card:focus-visible{border-color:rgba(210,154,102,.4);background:#1d211f;box-shadow:0 1rem 2.8rem rgba(0,0,0,.3)}\n.study-desk[data-skin=\"care\"] .book-copy span{color:#999b96}\n.study-desk[data-skin=\"care\"] .book-layers b{background:rgba(238,233,223,.06);color:#bbb8b1}\n.study-desk[data-skin=\"care\"] .load-screen{background:rgba(9,12,11,.96)}\n.study-desk[data-skin=\"care\"] .load-box{border-color:rgba(210,154,102,.2);background:#151917;color:#eee8de;box-shadow:0 1.5rem 4rem rgba(0,0,0,.45)}\n.study-desk[data-skin=\"care\"] .load-title{color:#e9e4da}\n.study-desk[data-skin=\"care\"] .care-wire::before{border-color:rgba(210,154,102,.2)}\n.study-desk[data-skin=\"care\"] .wire-node{border-color:rgba(210,154,102,.26);background:#1c211e;color:#d5b28f;box-shadow:none}\n.study-desk[data-skin=\"care\"] .load-caption{background:rgba(238,233,223,.05);color:#aaa79f}\n\n/* CARE skin refinement: flatter, continuous surfaces from the advanced Library. */\n.study-desk[data-skin=\"care\"]{\n  border-color:#303641;\n  border-radius:8px;\n  background:#0d1016;\n  box-shadow:none;\n}\n.study-desk[data-skin=\"care\"] .desk-toolbar{\n  min-height:4rem;\n  border-bottom-color:#292f39;\n  background:#101319;\n  box-shadow:none;\n  backdrop-filter:none;\n}\n.study-desk[data-skin=\"care\"] .desk-mark{border-color:#3b424d;border-radius:6px;background:#0b0e13;box-shadow:none}\n.study-desk[data-skin=\"care\"] .desk-tab,\n.study-desk[data-skin=\"care\"] .desk-arrow,\n.study-desk[data-skin=\"care\"] .desk-text-size button{border-color:#303641;border-radius:6px;background:#171b22}\n.study-desk[data-skin=\"care\"] .desk-tab.active{border-color:color-mix(in srgb,var(--pane-accent) 62%,#4b535e);border-radius:6px;background:#ece8df;box-shadow:none}\n.study-desk[data-skin=\"care\"] .desk-skin{border-color:#303641;border-radius:6px;background:#151920}\n.study-desk[data-skin=\"care\"] .desk-skin button{border-radius:4px}\n.study-desk[data-skin=\"care\"] .route-toolbar{border-color:#353b46;border-radius:6px;background:#171b22}\n.study-desk[data-skin=\"care\"] .route-toolbar button{border-radius:4px;background:#222730}\n.study-desk[data-skin=\"care\"] .desk-strip{\n  gap:.75rem;\n  padding:.75rem;\n  scroll-padding:.75rem;\n  background:#0d1016;\n}\n.study-desk[data-skin=\"care\"] .desk-window{\n  border-color:#2c323c;\n  border-radius:8px;\n  background:#11151b;\n  box-shadow:none;\n}\n.study-desk[data-skin=\"care\"] .desk-window:not(.pane-focused){opacity:.88}\n.study-desk[data-skin=\"care\"] .desk-window.pane-focused{\n  border-color:color-mix(in srgb,var(--pane-accent) 45%,#343b45);\n  box-shadow:none;\n}\n.study-desk[data-skin=\"care\"] .window-titlebar{\n  height:2.7rem;\n  border:0;\n  border-bottom:1px solid rgba(225,229,235,.1);\n  background:color-mix(in srgb,var(--pane-accent) 58%,#171b22);\n  box-shadow:none;\n}\n.study-desk[data-skin=\"care\"] .window-titlebar span{border-radius:4px;background:rgba(9,12,17,.28)}\n.study-desk[data-skin=\"care\"] .window-body{height:calc(100% - 2.7rem);background:#11151b}\n.study-desk[data-skin=\"care\"] .contents-rail{border-right-color:#292f38;background:#0f1319}\n.study-desk[data-skin=\"care\"] .chapter-button{border-color:#2b313a;border-radius:5px;background:#151920}\n.study-desk[data-skin=\"care\"] .chapter-button:hover,\n.study-desk[data-skin=\"care\"] .chapter-button:focus-visible{background:#1b2028}\n.study-desk[data-skin=\"care\"] .chapter-button.active{border-color:color-mix(in srgb,var(--pane-accent) 58%,#3f4752);background:color-mix(in srgb,var(--pane-accent) 14%,#151920)}\n.study-desk[data-skin=\"care\"] .source-copy{background:#11151a}\n.study-desk[data-skin=\"care\"] .passage.selected{border-radius:0;background:color-mix(in srgb,#b56f3b 9%,#11151a)}\n.study-desk[data-skin=\"care\"] .care-head{border-bottom-color:#292f38;background:#11151b}\n.study-desk[data-skin=\"care\"] .layer-route b{border-radius:4px;background:#151a21}\n.study-desk[data-skin=\"care\"] .care-sections{padding:.75rem;background:#0d1016}\n.study-desk[data-skin=\"care\"] .care-section{\n  margin-bottom:.75rem;\n  border-color:#2b313b;\n  border-radius:7px;\n  background:#11151b;\n  box-shadow:none;\n}\n.study-desk[data-skin=\"care\"] .care-section>summary{\n  min-height:2.75rem;\n  padding:.7rem .8rem;\n  border-bottom:1px solid rgba(225,229,235,.09);\n  background:color-mix(in srgb,var(--pane-accent) 60%,#171b22);\n  letter-spacing:.055em;\n  text-transform:uppercase;\n}\n.study-desk[data-skin=\"care\"] .care-section:not([open])>summary{border-bottom:0}\n.study-desk[data-skin=\"care\"] .care-section>summary::before{border-radius:4px;background:rgba(9,12,17,.2)}\n.study-desk[data-skin=\"care\"] .axiom-list{gap:0;padding:0;background:#11151b}\n.study-desk[data-skin=\"care\"] .axiom-button{\n  position:relative;\n  padding:1rem 1.05rem 1.15rem;\n  border:0;\n  border-radius:0;\n  background:transparent;\n}\n.study-desk[data-skin=\"care\"] .axiom-button+.axiom-button{border-top:1px solid #262c34}\n.study-desk[data-skin=\"care\"] .axiom-button:hover,\n.study-desk[data-skin=\"care\"] .axiom-button:focus-visible{border:0;background:#171c23}\n.study-desk[data-skin=\"care\"] .axiom-button.selected{\n  border:0;\n  background:color-mix(in srgb,var(--pane-accent) 13%,#11151b);\n  box-shadow:inset 3px 0 color-mix(in srgb,var(--pane-accent) 76%,#dce2e4);\n}\n.study-desk[data-skin=\"care\"] .axiom-id{font-size:.54rem;letter-spacing:.025em}\n.study-desk[data-skin=\"care\"] .axiom-text{font-size:calc(.92rem * var(--desk-text-scale,1));line-height:1.64}\n.study-desk[data-skin=\"care\"] .route-focus{background:#0f1318}\n.study-desk[data-skin=\"care\"] .route-focus-head{border-radius:6px;background:#171b22}\n.study-desk[data-skin=\"care\"] .route-close{border-radius:5px}\n.study-desk[data-skin=\"care\"] .route-selected-note{border-radius:5px;background:#171b22}\n.study-desk[data-skin=\"care\"] .route-sheet{border-color:#2b313b;border-radius:7px;background:#11151b}\n.study-desk[data-skin=\"care\"] .route-sheet h3{background:color-mix(in srgb,var(--pane-accent) 54%,#171b22)}\n.study-desk[data-skin=\"care\"] .route-sheet h3 b{border-radius:4px}\n.study-desk[data-skin=\"care\"] .route-list{gap:0;padding:0;background:#11151b}\n.study-desk[data-skin=\"care\"] .route-card{padding:1rem;border:0;border-radius:0;background:transparent}\n.study-desk[data-skin=\"care\"] .route-card+.route-card{border-top:1px solid #262c34}\n.study-desk[data-skin=\"care\"] .route-card:hover,\n.study-desk[data-skin=\"care\"] .route-card:focus-visible{background:#171c23}\n.study-desk[data-skin=\"care\"] .route-card.selected{border:0;background:color-mix(in srgb,var(--pane-accent) 13%,#11151b);box-shadow:inset 3px 0 var(--pane-accent)}\n.study-desk[data-skin=\"care\"] .route-source-copy{gap:0;padding:.75rem;background:#0f1318}\n.study-desk[data-skin=\"care\"] .route-source-card{border-color:#2b313b;border-radius:5px;background:#11151b;box-shadow:none}\n.study-desk[data-skin=\"care\"] .route-source-card+.route-source-card{margin-top:.65rem}\n.study-desk[data-skin=\"care\"] .inspector-empty>div,\n.study-desk[data-skin=\"care\"] .inspect-text,\n.study-desk[data-skin=\"care\"] .rating-box,\n.study-desk[data-skin=\"care\"] .trace-group{border-color:#2b313b;border-radius:6px;background:#11151b}\n.study-desk[data-skin=\"care\"] .star{border-radius:4px}\n.study-desk[data-skin=\"care\"] .trace-group h4{background:#171b22}\n.study-desk[data-skin=\"care\"] .trace-list{gap:0;padding:0;background:#11151b}\n.study-desk[data-skin=\"care\"] .trace-card{border-radius:0;background:transparent}\n.study-desk[data-skin=\"care\"] .trace-card+.trace-card{border-top:1px solid #262c34}\n.study-desk[data-skin=\"care\"] .desk-status{border-top-color:#292f38;background:#0c0f14}\n.study-desk[data-skin=\"care\"] .status-cell{border-radius:4px;background:#171b22}\n.study-desk[data-skin=\"care\"] .library-head{background:#11151b}\n.study-desk[data-skin=\"care\"] .book-card{border-color:#2b313b;border-radius:7px;background:#11151b}\n.study-desk[data-skin=\"care\"] .book-card:hover,\n.study-desk[data-skin=\"care\"] .book-card:focus-visible{background:#171c23;box-shadow:none;transform:none}\n.study-desk[data-skin=\"care\"] .load-box{border-radius:8px;box-shadow:none}\n.study-desk[data-skin=\"care\"] .wire-node{border-radius:4px}\n.study-desk[data-skin=\"care\"] .load-caption{border-radius:4px}\n\n/* Classic desk skin: preserved rather than deleted. */\n.study-desk[data-skin=\"classic\"]{min-height:0;border:2px solid #111;border-radius:0;background:#c6c6c6;box-shadow:inset 1px 1px #fff,inset -1px -1px #555,8px 8px 0 rgba(0,0,0,.12);font-family:var(--st-code-font,ui-monospace,SFMono-Regular,Menlo,monospace)}\n.study-desk[data-skin=\"classic\"] button{border-radius:0}\n.study-desk[data-skin=\"classic\"] .desk-toolbar{height:3.15rem;min-height:3.15rem;padding:.42rem .55rem;border-bottom:2px solid #111;background:#d6d6d6;color:#101010;box-shadow:inset 1px 1px #fff,inset 0 -1px #777}\n.study-desk[data-skin=\"classic\"] .desk-mark{border:2px solid #111;border-radius:0;background:#111;box-shadow:none}\n.study-desk[data-skin=\"classic\"] .desk-title strong{font:900 .72rem/1.05 var(--st-code-font,ui-monospace,monospace);letter-spacing:.12em}\n.study-desk[data-skin=\"classic\"] .desk-title span{color:#4c4c4c;font:.56rem/1.05 var(--st-code-font,ui-monospace,monospace);letter-spacing:.04em}\n.study-desk[data-skin=\"classic\"] .desk-tab,.study-desk[data-skin=\"classic\"] .desk-arrow,.study-desk[data-skin=\"classic\"] .desk-text-size button{border:2px solid;border-color:#fff #4c4c4c #4c4c4c #fff;border-radius:0;background:#c9c9c9;color:#101010;box-shadow:none;font-family:var(--st-code-font,ui-monospace,monospace)}\n.study-desk[data-skin=\"classic\"] .desk-tab.active{border-color:#444 #fff #fff #444;background:#9daac0;color:#061a43}\n.study-desk[data-skin=\"classic\"] .desk-skin{border:2px solid;border-color:#fff #555 #555 #fff;border-radius:0;background:#c9c9c9}\n.study-desk[data-skin=\"classic\"] .desk-skin>span{color:#444}\n.study-desk[data-skin=\"classic\"] .desk-skin button{border:1px solid transparent;color:#333}\n.study-desk[data-skin=\"classic\"] .desk-skin button.active{border-color:#555 #fff #fff #555;background:#9daac0;color:#061a43;box-shadow:none}\n.study-desk[data-skin=\"classic\"] .desk-strip{gap:.8rem;padding:.8rem;scroll-padding:.8rem;background:#c6c6c6;box-shadow:none;scrollbar-color:#777 #d9d9d9}\n.study-desk[data-skin=\"classic\"] .desk-window,.study-desk[data-skin=\"classic\"] .desk-window.care-pane{border:2px solid;border-color:#fff #333 #333 #fff;border-radius:0;background:#ececec;box-shadow:2px 2px 0 #111;opacity:1;filter:none}\n.study-desk[data-skin=\"classic\"] .window-titlebar{height:2.35rem;padding:.35rem .45rem;border:0;border-bottom:2px solid #111;background:var(--pane-accent);color:#fff;box-shadow:none}\n.study-desk[data-skin=\"classic\"] .window-titlebar span{border:1px solid rgba(255,255,255,.65);border-radius:0;background:transparent;color:#fff}\n.study-desk[data-skin=\"classic\"] .window-body{height:calc(100% - 2.35rem);background:#efefef}\n.study-desk[data-skin=\"classic\"] .contents-rail{border-right:2px solid #777;background:#d5d5d5;color:#101010}\n.study-desk[data-skin=\"classic\"] .chapter-button{border:1px solid #676767;border-radius:0;background:#e7e7e7;color:#101010;font-family:var(--st-code-font,ui-monospace,monospace)}\n.study-desk[data-skin=\"classic\"] .chapter-button.active{border:2px solid #111;background:#fff;box-shadow:none}\n.study-desk[data-skin=\"classic\"] .care-head{padding:1rem 1rem .8rem;border:0;border-bottom:2px solid #888;background:#d8d8d8}\n.study-desk[data-skin=\"classic\"] .care-head::after{display:none}\n.study-desk[data-skin=\"classic\"] .care-head h2{font:800 1.02rem/1.2 var(--st-code-font,ui-monospace,monospace)}\n.study-desk[data-skin=\"classic\"] .care-sections{padding:.7rem;background:#efefef}\n.study-desk[data-skin=\"classic\"] .care-section{margin-bottom:.55rem;border:1px solid #555;border-radius:0;background:#dadada;box-shadow:none}\n.study-desk[data-skin=\"classic\"] .care-section>summary{min-height:0;padding:.55rem .6rem;background:#cfcfcf;color:#101010;font-size:.62rem;letter-spacing:0;text-transform:none}\n.study-desk[data-skin=\"classic\"] .care-section>summary::before{border:1px solid #555;border-radius:0;background:#eee;color:#101010}\n.study-desk[data-skin=\"classic\"] .care-section>summary small{color:#5d5d5d}\n.study-desk[data-skin=\"classic\"] .axiom-list{gap:1px;padding:1px;background:#777}\n.study-desk[data-skin=\"classic\"] .axiom-button{padding:.72rem .72rem .8rem;border:0;border-radius:0;background:#f0f0f0}\n.study-desk[data-skin=\"classic\"] .axiom-button+.axiom-button{border-top:0}\n.study-desk[data-skin=\"classic\"] .axiom-button.selected{background:#fff4d5;box-shadow:inset 4px 0 var(--pane-accent)}\n.study-desk[data-skin=\"classic\"] .axiom-text{font:.67rem/1.52 var(--st-code-font,ui-monospace,monospace)}\n.study-desk[data-skin=\"classic\"] .desk-status{border-top:2px solid #111;background:#cecece;color:#101010;font-family:var(--st-code-font,ui-monospace,monospace)}\n.study-desk[data-skin=\"classic\"] .status-cell{border:1px solid;border-color:#666 #fff #fff #666;border-radius:0;background:#c2c2c2;color:#101010}\n.study-desk[data-skin=\"classic\"] .status-help{color:#555}\n\n@media(max-width:900px){.desk-skin>span{display:none}.desk-skin{padding:.12rem}.desk-skin button{padding:.22rem .34rem}.study-desk[data-skin=\"library\"] .desk-toolbar,.study-desk[data-skin=\"care\"] .desk-toolbar{gap:.4rem}.study-desk[data-skin=\"library\"] .desk-title span,.study-desk[data-skin=\"care\"] .desk-title span{display:none}}\n\n/* Keep sheet controls visible while each page scrolls independently. */\n.study-desk .desk-window{display:flex;flex-direction:column}\n.study-desk .window-titlebar{flex:0 0 auto}\n.study-desk .desk-window .window-body{height:auto;min-height:0;flex:1 1 0;overflow-y:auto;overflow-x:hidden;overscroll-behavior-x:auto;overscroll-behavior-y:contain;touch-action:pan-x pan-y}\n.study-desk .source-layout{display:block;min-height:100%}\n.study-desk .source-pane{flex-basis:min(35rem,calc(100vw - 7rem));min-width:28rem}\n.study-desk .desk-strip{scroll-snap-type:none;scrollbar-width:auto}\n.study-desk .desk-strip::-webkit-scrollbar{height:.85rem}\n.pane-slider{flex:0 0 auto;min-width:0;padding:.85rem var(--reader-section-inset,.85rem) .65rem;border-bottom:1px solid color-mix(in srgb,var(--pane-accent) 28%,transparent);background:var(--desk-paper);color:var(--desk-ink)}\n.source-pane .pane-slider{padding-inline:var(--reader-source-inset,1.35rem)}\n.care-pane .slider-heading{padding-inline:.4rem}\n.slider-heading{display:flex;align-items:center;gap:.6rem;min-height:1.5rem;font-size:.6rem;line-height:1.4}\n.slider-heading>span{color:var(--pane-accent);font-weight:800;white-space:nowrap}\n.slider-heading strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:650}\n.slider-heading .slider-jump-trigger{display:flex;align-items:center;gap:.38rem;min-width:0;max-width:100%;padding:.15rem .25rem;margin:-.15rem -.25rem;border:1px solid transparent;border-radius:4px;background:transparent;color:inherit;text-align:left;cursor:pointer}\n.slider-jump-trigger svg{flex:0 0 auto;width:.7rem;height:.7rem;fill:none;stroke:currentColor;stroke-width:1.5;opacity:.6}\n.slider-heading .slider-jump-trigger:hover,.slider-heading .slider-jump-trigger:focus-visible,.slider-heading .slider-jump-trigger[aria-expanded=\"true\"]{outline:none;border-color:color-mix(in srgb,var(--pane-accent) 55%,transparent);background:color-mix(in srgb,var(--pane-accent) 12%,transparent)}\n.slider-jump-menu{position:absolute;z-index:110;display:flex;flex-direction:column;overflow:hidden;border:1px solid color-mix(in srgb,var(--pane-accent) 50%,var(--desk-ink));border-radius:9px;background:var(--desk-paper);color:var(--desk-ink);box-shadow:0 .7rem 2rem #0005;font-family:var(--st-font,system-ui,sans-serif)}\n.slider-jump-search-row{flex:0 0 auto;padding:.7rem;border-bottom:1px solid color-mix(in srgb,currentColor 16%,transparent)}\n.slider-jump-search-row label{display:block;margin-bottom:.4rem;font-size:.62rem;font-weight:750}\n.slider-jump-search-row input{display:block;box-sizing:border-box;width:100%;min-width:0;padding:.55rem .65rem;border:1px solid color-mix(in srgb,currentColor 30%,transparent);border-radius:5px;background:color-mix(in srgb,var(--desk-paper) 92%,var(--desk-ink));color:inherit;font-size:.72rem}\n.slider-jump-search-row input:focus{outline:2px solid var(--pane-accent);outline-offset:1px}\n.slider-jump-options{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:.3rem;scrollbar-width:thin}\n.slider-jump-option{display:flex;align-items:center;gap:.65rem;width:100%;padding:.6rem;border:0;border-radius:5px;background:transparent;color:inherit;text-align:left;cursor:pointer}\n.slider-jump-option:hover,.slider-jump-option[data-highlighted]{background:color-mix(in srgb,var(--pane-accent) 20%,transparent)}\n.slider-jump-option[aria-selected=\"true\"]{box-shadow:inset 2px 0 var(--pane-accent)}\n.slider-jump-option small{flex:0 0 3.6rem;color:color-mix(in srgb,currentColor 65%,transparent);font:700 .58rem/1.3 var(--st-code-font,ui-monospace,monospace)}\n.slider-jump-option strong{flex:1;min-width:0;font-size:.73rem;line-height:1.4;font-weight:550;overflow-wrap:anywhere}\n.slider-jump-check{width:.8rem;flex:0 0 auto;font-size:.7rem;color:var(--pane-accent)}\n.slider-jump-status{margin:0;padding:.5rem .9rem;font-size:.6rem;opacity:.65;border-top:1px solid color-mix(in srgb,currentColor 12%,transparent)}\n.study-desk[data-skin=\"care\"] .slider-jump-menu{--desk-paper:#12161d;--desk-ink:#ece8df}\n.study-desk[data-skin=\"library\"] .slider-jump-menu{--desk-paper:#251d16;--desk-ink:#eee3d0}\n.study-desk[data-skin=\"classic\"] .slider-jump-menu{--desk-paper:#dedede;--desk-ink:#101010;border-radius:0}\n.slider-heading output{margin-left:auto;font:700 .52rem/1.4 var(--st-code-font,ui-monospace,monospace);white-space:nowrap;opacity:.7}\n.slider-track{--slider-thumb-size:16px;--slider-ring-size:2px;--slider-edge:calc(var(--slider-ring-size) + var(--slider-thumb-size)/2);position:relative;height:2.8rem;margin-top:.38rem;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:none}\n.slider-track::-webkit-scrollbar{display:none}\n.slider-rail{position:relative;min-width:max(100%,calc(var(--slider-count,1) * 2.5rem));height:2.8rem}\n/* The line ends at its first/last stop; the thumb's outer ring meets the text inset. */\n.slider-rail::before{content:\"\";position:absolute;left:var(--slider-edge);right:var(--slider-edge);top:calc(.93rem - 1px);height:2px;background:var(--pane-accent);pointer-events:none}\n.slider-rail:has(.sheet-slider[max=\"0\"])::before{display:none}\n.sheet-slider{position:absolute;z-index:4;left:var(--slider-ring-size);top:.18rem;appearance:none;-webkit-appearance:none;width:calc(100% - 2 * var(--slider-ring-size));height:1.5rem;margin:0;padding:0;border:0;border-radius:0;background:transparent;cursor:grab;touch-action:pan-y;accent-color:var(--pane-accent)}\n.sheet-slider:active{cursor:grabbing}\n.sheet-slider::-webkit-slider-runnable-track{height:2px;background:transparent;border-radius:999px}\n.sheet-slider::-moz-range-track{height:2px;background:transparent;border-radius:999px}\n.sheet-slider::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:16px;height:16px;margin-top:-7px;border:4px solid var(--desk-paper);border-radius:50%;background:var(--pane-accent);box-shadow:0 0 0 2px var(--pane-accent),0 .25rem 1rem color-mix(in srgb,var(--pane-accent) 32%,transparent)}\n.sheet-slider::-moz-range-thumb{box-sizing:border-box;width:16px;height:16px;border:4px solid var(--desk-paper);border-radius:50%;background:var(--pane-accent);box-shadow:0 0 0 2px var(--pane-accent)}\n.sheet-slider:focus-visible{outline:none}\n.sheet-slider:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 2px var(--pane-accent),0 0 0 7px color-mix(in srgb,var(--pane-accent) 15%,transparent)}\n.sheet-slider:focus-visible::-moz-range-thumb{box-shadow:0 0 0 2px var(--pane-accent),0 0 0 7px color-mix(in srgb,var(--pane-accent) 15%,transparent)}\n.sheet-slider:disabled{cursor:default;opacity:.5}\n.slider-stops{position:absolute;z-index:3;left:var(--slider-edge);right:var(--slider-edge);top:.18rem;height:2.5rem;pointer-events:none}\n.slider-stop{position:absolute;top:0;left:var(--stop-x,0%);display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;align-content:start;gap:.65rem;width:2.5rem;min-width:0;min-height:1.65rem;margin:0;padding:.625rem .12rem 0;border:0;border-radius:0;background:transparent;color:inherit;cursor:pointer;pointer-events:auto;transform:translateX(-50%)}\n.slider-stop:is(:first-child,:last-child){width:calc(2 * var(--slider-edge));padding-inline:0}\n.slider-stop:first-child .slider-stop-label{width:2.5rem;justify-self:start;text-align:left}\n.slider-stop:last-child:not(:first-child) .slider-stop-label{width:2.5rem;justify-self:end;text-align:right}\n.slider-dot{width:4px;height:4px;border:1px solid color-mix(in srgb,var(--pane-accent) 72%,transparent);border-radius:50%;background:var(--desk-paper);transition:transform .22s ease,background .22s ease,box-shadow .22s ease}\n.slider-stop:hover .slider-dot,.slider-stop:focus-visible .slider-dot{transform:scale(1.65);background:var(--pane-accent)}\n.slider-stop.active .slider-dot{transform:scale(2);background:var(--pane-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--pane-accent) 14%,transparent)}\n.slider-stop-label{display:block;width:100%;overflow:hidden;color:color-mix(in srgb,var(--desk-ink) 60%,transparent);font:730 .49rem/1.15 var(--st-code-font,ui-monospace,monospace);text-align:center;text-overflow:ellipsis;white-space:nowrap;opacity:0;transform:translateY(3px);transition:opacity .2s ease,transform .2s ease,color .2s ease}\n.slider-stop:hover .slider-stop-label,.slider-stop:focus-visible .slider-stop-label,.slider-stop.active .slider-stop-label{opacity:1;transform:none}\n.slider-stop.active .slider-stop-label{color:var(--pane-accent)}\n.slider-stop:focus-visible{outline:none}.slider-stop:focus-visible .slider-stop-label{text-decoration:underline;text-underline-offset:2px}\n.slider-endpoints{display:flex;justify-content:space-between;color:var(--pane-accent);font:750 .46rem/1 var(--st-code-font,ui-monospace,monospace);letter-spacing:.07em}\n@media(prefers-reduced-motion:reduce){.slider-stop,.slider-stop::before,.slider-dot,.slider-stop-label{transition:none}}\n.study-desk[data-skin=\"care\"] .pane-slider{--desk-paper:#0e1117;--desk-ink:#fafafa;background:#0e1117;color:#fafafa}\n/* Use the Advanced Library's palette and exact header gradient, without focus dimming. */\n.study-desk[data-skin=\"care\"] .desk-window,\n.study-desk[data-skin=\"care\"] .desk-window:not(.pane-focused),\n.study-desk[data-skin=\"care\"] .desk-window.pane-focused{opacity:1;filter:none}\n.study-desk[data-skin=\"care\"] .window-titlebar,\n.study-desk[data-skin=\"care\"] .care-section>summary,\n.study-desk[data-skin=\"care\"] .route-sheet h3{background:linear-gradient(90deg,var(--pane-accent),color-mix(in srgb,var(--pane-accent) 84%,#191713));color:#fffaf2}\n.study-desk[data-skin=\"care\"] .care-section>summary:hover{filter:brightness(1.06)}\n.study-desk[data-skin=\"care\"] .window-body,\n.study-desk[data-skin=\"care\"] .source-copy,\n.study-desk[data-skin=\"care\"] .care-head,\n.study-desk[data-skin=\"care\"] .care-sections,\n.study-desk[data-skin=\"care\"] .axiom-list{background:#0e1117;color:#fafafa}\n.study-desk[data-skin=\"care\"] .axiom-text,\n.study-desk[data-skin=\"care\"] .care-head h2,\n.study-desk[data-skin=\"care\"] .source-head h2,\n.study-desk[data-skin=\"care\"] .passage{color:#fafafa}\n.study-desk[data-skin=\"care\"] .care-head .pane-kicker{color:color-mix(in srgb,var(--pane-accent) 72%,#fff 28%)}\n.study-desk[data-skin=\"care\"] .axiom-id,\n.study-desk[data-skin=\"care\"] .route-card-id{color:color-mix(in srgb,var(--pane-accent) 62%,#fff 38%)}\n/* A route is drawn at the margins, leaving the text as the main event. */\n.route-threads{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;overflow:hidden}\n.route-thread{fill:none;stroke-width:1.35;opacity:.42;transition:opacity .18s,stroke-width .18s}\n.route-thread.active{opacity:1;stroke-width:2.1}\n.route-edge-continuation{fill:none;stroke-width:1;opacity:.7}\n.route-port{stroke-width:1.5;fill:var(--desk-paper);opacity:.9}\n.study-desk[data-skin=\"care\"] .route-edge-continuation{fill:none;stroke-width:1;opacity:.7}\n.route-port{fill:#0e1117}\n.route-arrival{position:absolute;top:.65rem;right:.85rem;width:3.5rem;height:1.7rem;opacity:.62;transition:opacity .2s;pointer-events:none}\n.route-arrival svg{display:block;width:100%;height:100%;overflow:visible}\n.axiom-button.selected .axiom-id{padding-right:4.2rem;min-height:1rem}\n.axiom-button.selected:hover .route-arrival,.axiom-button.selected:focus-visible .route-arrival{opacity:.9}\n.confluence-thread{fill:none;stroke-width:1;opacity:.7}\n.confluence-target{fill:var(--desk-paper);stroke:var(--pane-accent);stroke-width:1.3}\n.study-desk[data-skin=\"care\"] .confluence-target{fill:#0e1117}\n.route-recipient{display:flex;align-items:center;gap:.55rem;margin:0 .8rem .6rem;padding:.55rem .7rem;border:1px solid color-mix(in srgb,var(--pane-accent) 22%,transparent);border-radius:5px;font-size:.49rem;line-height:1.5}\n.route-recipient>span{min-width:0;overflow-wrap:anywhere}.route-recipient b{color:var(--pane-accent)}\n.route-recipient .route-close{font-size:.45rem;flex-shrink:0}\n/* Route history controls. */\n.route-history-actions{display:flex;align-items:center;gap:.25rem;flex-shrink:0}\n.study-desk .route-toolbar .route-history-actions button{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;width:auto;height:1.65rem;min-width:0;margin:0;padding:.3rem .55rem;border:1px solid #40536b;border-radius:5px;background:#203349;color:#f5f7fb;font:650 .58rem/1.2 var(--st-font,ui-sans-serif,system-ui,sans-serif);letter-spacing:0;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.12)}\n.study-desk .route-toolbar .route-history-actions .route-history-arrow{width:1.65rem;padding:.3rem;background:#171e29;border-color:#354150;color:#e2e8f0}\n.study-desk .route-toolbar .route-history-actions .route-close{background:#eae5da;color:#252722;border-color:#eae5da}\n.route-history-actions svg,.route-recipient .route-pane-close svg{width:.82rem;height:.82rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.study-desk .route-toolbar .route-history-actions button:hover:not(:disabled){background:#2a425e;border-color:#607a98}\n.study-desk .route-toolbar .route-history-actions .route-close:hover{background:#f6f1e8;border-color:#f6f1e8}\n.study-desk .route-toolbar .route-history-actions button:focus-visible{outline:2px solid #88a7ca;outline-offset:2px}\n.study-desk .route-toolbar .route-history-actions button:disabled{opacity:.3;cursor:default;box-shadow:none}\n.study-desk .route-recipient .route-pane-close{display:grid;place-items:center;width:1.65rem;height:1.65rem;min-width:0;margin-left:auto;padding:.3rem;border:1px solid #303741;border-radius:5px;background:#171b22;color:#edf0f5;box-shadow:none}\n.study-desk .route-recipient .route-pane-close:hover{border-color:#566373;background:#222b37}\n.study-desk .route-recipient .route-pane-close:focus-visible{outline:2px solid #88a7ca;outline-offset:2px}\n/* End route history controls. */\n.route-card,.route-source-card,.axiom-button{position:relative}\n.route-card.axiom-selected,.route-source-card.axiom-selected{box-shadow:inset 3px 0 var(--pane-accent);background:color-mix(in srgb,var(--pane-accent) 14%,var(--desk-paper))}\n.study-desk[data-skin=\"care\"] .route-card.axiom-selected,.study-desk[data-skin=\"care\"] .route-source-card.axiom-selected{background:color-mix(in srgb,var(--pane-accent) 14%,#0e1117)}\n.axiom-button.route-feeder{box-shadow:inset 2px 0 color-mix(in srgb,var(--pane-accent) 45%,transparent)}\n.axiom-button.route-feeder.route-related{box-shadow:inset 3px 0 var(--pane-accent);filter:brightness(1.12)}\n.route-card.route-related,.route-source-card.route-related{box-shadow:inset 3px 0 var(--pane-accent);background:color-mix(in srgb,var(--pane-accent) 13%,var(--desk-paper))}\n.study-desk[data-skin=\"care\"] .route-card.route-related,.study-desk[data-skin=\"care\"] .route-source-card.route-related{background:color-mix(in srgb,var(--pane-accent) 14%,#0e1117)}\n.study-desk .axiom-button.selected{border-radius:3px;box-shadow:inset 3px 0 var(--pane-accent),inset 0 0 0 1px color-mix(in srgb,var(--pane-accent) 34%,transparent);background:color-mix(in srgb,var(--pane-accent) 10%,var(--desk-paper))}\n.study-desk[data-skin=\"care\"] .axiom-button.selected{background:linear-gradient(110deg,color-mix(in srgb,var(--pane-accent) 17%,#0e1117),#0e1117);color:#fafafa}\n.route-arrival-new .confluence-thread{animation:route-arrive .8s ease-out both}\n@keyframes route-arrive{from{opacity:0;stroke-dasharray:2 7;stroke-dashoffset:30}to{opacity:.7;stroke-dasharray:2 0;stroke-dashoffset:0}}\n@media(prefers-reduced-motion:reduce){.route-arrival-new .confluence-thread{animation:none}.route-thread{transition:none}}\n@media(max-width:760px){.study-desk .source-pane,.study-desk .care-pane{flex-basis:min(35rem,calc(100vw - 3.8rem));min-width:min(28rem,calc(100vw - 3.8rem))}}\n\n/* Route direction controls. */\n.route-axiom-row{position:relative;min-width:0}\n.study-desk[data-skin=\"care\"] .axiom-button+.route-axiom-row,.study-desk[data-skin=\"care\"] .route-axiom-row+.axiom-button{border-top:1px solid #262c34}\n.study-desk[data-skin=\"library\"] .axiom-button+.route-axiom-row,.study-desk[data-skin=\"library\"] .route-axiom-row+.axiom-button{border-top:1px solid rgba(84,67,52,.13)}\n.route-axiom-row:hover .route-arrival,.route-axiom-row:focus-within .route-arrival{opacity:.9}\n.route-arrival[data-route-direction-control]{pointer-events:auto;touch-action:pan-y}\n.route-arrival[title]{pointer-events:auto}\n.route-arrival[title] svg{pointer-events:none}\n.route-direction-slider{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize;touch-action:pan-y}\n.route-arrival:focus-within{outline:1px solid var(--pane-accent);outline-offset:4px;border-radius:4px}\n/* End route direction controls. */\n\n/* Reading selection is independent of the established Routes .selected state. */\n.axiom-row,.passage-row{position:relative;min-width:0}\n.passage .passage-address{padding-inline-end:4.6rem}\n.study-desk .axiom-row+.axiom-row{border-top:1px solid color-mix(in srgb,var(--desk-ink) 14%,transparent)}\n.study-desk .axiom-row .axiom-id{padding-right:4.6rem;min-height:1.4rem}\n.study-desk .axiom-button.axiom-selected{background:color-mix(in srgb,var(--pane-accent) 9%,var(--desk-paper));box-shadow:inset 3px 0 var(--pane-accent)}\n.study-desk[data-skin=\"care\"] .axiom-button.axiom-selected{background:color-mix(in srgb,var(--pane-accent) 13%,#0e1117)}\n/* Keep keyboard position visible without framing the prose in a coloured box. */\n.study-desk [data-select-axiom]:focus,.study-desk [data-select-passage]:focus{outline:none}\n.study-desk[data-skin] [data-select-axiom]:focus-visible,.study-desk[data-skin] [data-select-passage]:focus-visible{outline:none;box-shadow:inset 3px 0 var(--pane-accent)}\n.study-desk [data-select-axiom]:focus-visible :is(.axiom-id,.route-card-id),.study-desk [data-select-passage]:focus-visible .passage-address{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}\n.axiom-routes{position:absolute;top:.65rem;right:.7rem;padding:.3rem .48rem;border:1px solid color-mix(in srgb,var(--pane-accent) 45%,transparent);border-radius:5px;background:var(--desk-paper);color:var(--pane-accent);font-size:.53rem;cursor:pointer}\n.axiom-routes[hidden]{display:none}\n.study-desk[data-skin=\"care\"] .axiom-routes{background:#171c23;color:#e4e6e8}\n/* A single compact control beside the sheet title keeps reading space clear. */\n.care-heading{display:flex;align-items:center;gap:.65rem}.care-heading h2{flex:1;min-width:0}\n.sheet-actions{display:flex;flex:0 0 auto;align-items:center;padding:.12rem;border:1px solid color-mix(in srgb,var(--pane-accent) 30%,transparent);border-radius:999px;background:color-mix(in srgb,var(--pane-accent) 7%,transparent)}\n.sheet-actions button{display:grid;place-items:center;width:1.85rem;height:1.85rem;padding:.35rem;border:0;border-radius:50%;background:transparent;color:var(--pane-accent);cursor:pointer}\n.sheet-actions button:hover{background:color-mix(in srgb,var(--pane-accent) 17%,transparent)}\n.sheet-actions svg{width:1rem;height:1rem;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.study-desk .sheet-actions button:focus-visible,.study-desk .axiom-routes:focus-visible,.study-desk [data-reading-sheet] summary:focus-visible{outline:2px solid var(--pane-accent);outline-offset:2px;opacity:1}\n.desk-selection-help{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}\n\n/* The shelf is a quiet entrance to the same CARE reading surfaces. */\n.study-desk:has(.library-window){display:block;border:0;border-radius:0 0 12px 12px;box-shadow:none}\n.study-desk .library-window{--shelf-line:rgba(220,208,184,.13);height:100%;overflow:auto;color:#eee9df;background:radial-gradient(ellipse at 7% 0,rgba(163,118,64,.08),transparent 38rem),#101416;scrollbar-color:#424942 transparent}\n.study-desk .library-head{align-items:center;padding:1rem 2rem .95rem;border:0;background:transparent}\n.study-desk .library-head>div:first-child{min-width:0}\n.study-desk .library-head .pane-kicker{color:#b89b70;font-size:.55rem;letter-spacing:.21em}\n.study-desk .library-head h2{margin:.3rem 0 0;color:#f0ebe1;font:500 clamp(1.75rem,2.2vw,2.1rem)/1.08 Georgia,\"Times New Roman\",serif;letter-spacing:-.045em;overflow-wrap:anywhere}\n.study-desk .library-head p{max-width:42rem;color:#929992;font-size:.73rem;line-height:1.65}\n.library-count{align-self:center;flex-shrink:0;display:grid;gap:.38rem;text-align:right;color:#9b9f97;font-size:.61rem;line-height:1.5}\n.library-count strong{color:#d8d3c7;font:500 1.55rem/1 Georgia,\"Times New Roman\",serif}\n.library-toolbar{position:sticky;top:0;z-index:5;padding:.8rem 2rem;border-bottom:1px solid var(--shelf-line);background:rgba(16,20,22,.97);backdrop-filter:blur(18px)}\n.library-controls{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}\n.study-desk .library-window[data-library-scope=\"lateral\"]{--shelf-accent:#9e78ab;--shelf-line:rgba(172,130,182,.2);background:radial-gradient(ellipse at 7% 0,rgba(110,79,154,.15),transparent 42rem),radial-gradient(ellipse at 93% 0,rgba(143,57,75,.09),transparent 38rem),#141217}\n.study-desk .library-window[data-library-scope=\"corpus\"]{--shelf-accent:#cb965e;--shelf-line:rgba(169,102,36,.23);background:radial-gradient(ellipse at 7% 0,rgba(169,102,36,.14),transparent 42rem),#171410}\n.library-window[data-library-scope=\"lateral\"] .library-toolbar{background:rgba(23,19,28,.97)}\n.library-window[data-library-scope=\"corpus\"] .library-toolbar{background:rgba(28,23,17,.97)}\n.study-desk .library-window[data-library-scope=\"lateral\"] .library-grid,.study-desk .library-window[data-library-scope=\"corpus\"] .library-grid{background:transparent}\n.library-window[data-library-scope=\"lateral\"] .library-toolbar :focus-visible,.library-window[data-library-scope=\"corpus\"] .library-toolbar :focus-visible{outline-color:var(--shelf-accent)}\n.library-tabs{display:flex;flex:1 1 100%;min-width:0;gap:.25rem;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:#424942 transparent}\n.library-tabs button{flex-shrink:0}\n.library-tools{display:flex;flex:1 1 100%;min-width:0;align-items:center;gap:.65rem}\n.library-toolbar button,.library-back{padding:.55rem .8rem;border:1px solid transparent;border-radius:6px;background:transparent;color:#a6aaa3;cursor:pointer;font-size:.66rem;white-space:nowrap}\n.library-toolbar button.active{border-color:rgba(97,148,127,.26);background:rgba(65,111,93,.23);color:#d7e7dc}\n.library-toolbar button:hover,.library-back:hover{background:#252c28;color:#f0ebe1}\n.library-toolbar button:focus-visible,.library-back:focus-visible,.library-toolbar input:focus-visible,.library-toolbar select:focus-visible{outline:2px solid #88b3a0;outline-offset:3px}\n.library-toolbar input,.library-toolbar select{min-width:0;max-width:100%;height:2.15rem;padding:.4rem .65rem;border:1px solid var(--shelf-line);border-radius:6px;background:#181e20;color:#cecfc6;font-size:.66rem;color-scheme:dark}\n.library-toolbar input::placeholder{color:#929a94}\n.library-search{flex:1 1 20rem;min-width:10rem;max-width:30rem;margin-right:auto}\n.library-search input{width:100%}\n.library-toolbar .library-archive{display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .6rem;border-color:var(--shelf-line)}\n.library-archive svg{width:.9rem;height:.9rem;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}\n.library-sort{display:flex;align-items:center;gap:.45rem;color:#939a93;font-size:.62rem}\n.library-sort select{max-width:12rem}\n.library-toolbar .library-filter-toggle{border-color:var(--shelf-line)}\n.library-toolbar .library-select-toggle{border-color:#466355;color:#c6dfce}\n.library-selection-tools{display:flex;align-items:center;gap:.35rem;padding-top:.65rem}\n.library-selection-tools[hidden]{display:none}\n.library-selection-tools button:disabled{opacity:.4;cursor:default}\n.library-selection-tools span{margin-left:auto;color:#91a998;font-size:.6rem}\n.book-selection{position:absolute;z-index:4;top:.3rem;left:.3rem;display:grid;place-items:center;width:2.3rem;height:2.3rem;padding:.55rem;border:0;border-radius:50%;background:#16221de8;color:#b6ccbc;cursor:pointer}\n.book-selection svg{width:1.15rem;height:1.15rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.book-selection[aria-checked=\"true\"]{background:#adceb7;color:#183125}\n.book-selection[aria-checked=\"mixed\"]{background:#345c47;color:#e7f1e9}\n.book-selection:focus-visible,.library-selection-tray button:focus-visible{outline:2px solid #b5d8c1;outline-offset:3px}\n.library-window:not([data-selecting=\"true\"]) .book-selection{display:none}\n.study-desk .library-window .book-card.is-selected{border-color:#5c886c;background:#31544033}\n.study-desk .library-window .book-card.is-part-selected{border-color:#466553;background:#3154401a}\n.library-selection-tray{position:sticky;z-index:6;bottom:1rem;display:flex;align-items:center;gap:1.2rem;width:calc(100% - 3rem);margin:0 1.5rem 1rem;padding:.9rem 1.1rem;border:1px solid #536e5c;border-radius:12px;background:#19271fed;box-shadow:0 12px 40px #0007;backdrop-filter:blur(20px)}\n.library-selection-tray[hidden]{display:none}\n.library-selection-copy{display:grid;gap:.28rem;flex:1;min-width:0}\n.library-selection-copy strong{color:#e2eddf;font:500 1rem/1.15 Georgia,\"Times New Roman\",serif}\n.library-selection-copy span{color:#a8bcae;font-size:.59rem;line-height:1.4}\n.library-selection-actions{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem}\n.library-selection-tray button{min-height:2.4rem;padding:.5rem .8rem;border:1px solid #5c7562;border-radius:7px;background:#2d4335;color:#e4ede0;font-size:.66rem;cursor:pointer;white-space:nowrap}\n.library-selection-tray button:hover:not(:disabled){background:#3c5946;border-color:#92b39a}\n.library-selection-tray button[data-library-selection-action=\"lateral\"]{border-color:#776682;background:#403347;color:#f3dff5}\n.library-selection-tray button[data-library-selection-action=\"corpus\"]{border-color:#82704c;background:#453a29;color:#f4e6ca}\n.library-selection-tray button:disabled{opacity:.4;cursor:default}\n.library-selection-tray button[data-library-selection-clear]{padding:.5rem;border-color:transparent;background:transparent;color:#b5c6b9}\n.library-selection-covers{display:flex;align-items:center;padding-left:.45rem;flex:none}\n.library-selection-covers i{display:block;width:1.6rem;height:2.35rem;margin-left:-.45rem;border:1px solid #b9d4ad40;border-radius:1px 3px 3px 1px;background:var(--cloth,#536453);box-shadow:-2px 3px 7px #0005;transform:rotate(var(--tilt,0deg));overflow:hidden}\n.library-selection-covers img{width:100%;height:100%;object-fit:cover}\n.library-head .library-edit-collection{padding:.5rem .75rem;border:1px solid #496350;border-radius:6px;background:#213428;color:#bfd7c4;font-size:.65rem;cursor:pointer}\n@media(max-width:760px){.library-selection-tray{bottom:.5rem;gap:.65rem;flex-wrap:wrap;width:calc(100% - 1rem);margin:0 .5rem .5rem;padding:.75rem}.library-selection-actions{width:100%}.library-selection-actions button{flex:1;min-height:2.75rem}.library-selection-covers{display:none}.library-selection-tools{flex-wrap:wrap}.library-selection-tools span{flex-basis:100%;margin-left:0}.book-selection{width:2.75rem;height:2.75rem}.library-toolbar .library-select-toggle{min-height:2.75rem}}\n.library-filters{display:flex;align-items:end;gap:.65rem;flex-wrap:wrap;margin-top:.85rem;padding-top:.85rem;border-top:1px solid var(--shelf-line)}\n.library-filters[hidden]{display:none}\n.library-filters label{display:grid;gap:.35rem;flex:1 1 9rem;max-width:17rem;color:#a1a79e;font-size:.6rem}\n.library-filters select{width:100%}\n.library-summary{display:flex;align-items:center;justify-content:space-between;gap:.75rem;min-height:2.8rem;padding:.8rem 2rem .25rem;color:#a0a79e;font-size:.6rem;line-height:1.5}\n.library-summary button{border:0;background:transparent;color:#c8b68e;font-size:.6rem;cursor:pointer}\n.study-desk .library-grid{grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:.85rem 1.05rem;padding:.5rem 1.5rem 2.5rem;background:transparent;align-items:stretch}\n.study-desk .library-window .book-card{display:flex;flex-direction:column;align-items:stretch;gap:0;padding:1rem .9rem 1.1rem;border:1px solid transparent;border-radius:9px;background:transparent;box-shadow:none;transition:background .18s,border-color .18s}\n.study-desk .library-window .book-card:hover,.study-desk .library-window .book-card:focus-visible{outline:none;border-color:rgba(186,157,110,.3);background:rgba(235,223,196,.035);box-shadow:none;transform:none}\n.study-desk .library-window .book-card:focus-visible{outline:2px solid #88b3a0;outline-offset:1px}\n.book-open{display:flex;flex:1;flex-direction:column;align-items:stretch;width:100%;min-width:0;padding:0;border:0;border-radius:inherit;background:transparent;color:inherit;text-align:inherit;cursor:pointer}\n.book-open:focus-visible{outline:none}\n.study-desk .library-window .book-card:has(.book-open:focus-visible){outline:2px solid #88b3a0;outline-offset:1px}\n.book-menu-toggle{position:absolute;z-index:3;top:.25rem;right:.25rem;display:grid;place-items:center;width:2rem;height:2rem;padding:.4rem;border:1px solid transparent;border-radius:50%;background:#172024;color:#c6ccc7;cursor:pointer;opacity:0;transition:opacity .12s,background .12s}\n.book-card:hover .book-menu-toggle,.book-card:focus-within .book-menu-toggle,.book-card.menu-open .book-menu-toggle{opacity:1}\n.book-menu-toggle:hover,.book-menu-toggle[aria-expanded=\"true\"]{border-color:#43534b;background:#26332d}\n.book-menu-toggle:focus-visible{opacity:1;outline:2px solid #88b3a0;outline-offset:2px}\n.book-menu-toggle svg{width:1rem;height:1rem;fill:currentColor;pointer-events:none}\n.book-context-menu{position:fixed;z-index:1000;display:grid;gap:2px;min-width:11.5rem;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:.3rem;border:1px solid #39443f;border-radius:10px;background:#151c1c;box-shadow:0 12px 36px rgba(0,0,0,.38);color:#e4e8df;font-family:var(--st-font,ui-sans-serif,system-ui,sans-serif)}\n.book-context-menu button{display:flex;align-items:center;gap:.65rem;width:100%;min-height:2.25rem;padding:.5rem .7rem;border:0;border-radius:6px;background:transparent;color:inherit;text-align:left;font:500 .75rem/1.2 var(--st-font,ui-sans-serif,system-ui,sans-serif);cursor:pointer;white-space:nowrap}\n.book-context-menu button:hover,.book-context-menu button:focus-visible{outline:none;background:#29362f;color:#fff}\n.book-context-menu button[data-book-menu-action=\"archive_book\"],.book-context-menu button[data-book-menu-action=\"restore_book\"],.book-context-menu button[data-book-menu-action=\"field_archive\"]{margin-top:.2rem;border-top:1px solid #303b35;border-radius:0 0 6px 6px;color:#c8b690}\n.book-menu-icon{display:grid;place-items:center;width:1rem;height:1rem;color:#9caf9f}\n.book-menu-icon svg{width:1rem;height:1rem;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.book-menu-status{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}\n@media(hover:none),(pointer:coarse){.book-menu-toggle{width:2.75rem;height:2.75rem;opacity:1}.book-context-menu button{min-height:2.75rem}}\n.book-object{position:relative;display:grid;place-items:center;width:100%;height:13.5rem;isolation:isolate}\n.book-object::after{content:\"\";position:absolute;z-index:-1;bottom:0;width:90%;height:1px;background:linear-gradient(90deg,transparent,rgba(223,207,175,.16),transparent)}\n.study-desk .library-window .book-cover{place-self:center;display:block;width:7.7rem;height:11.55rem;border:0;border-radius:2px 7px 7px 2px;box-shadow:-4px 3px 0 color-mix(in srgb,var(--cloth) 75%,#111),8px 12px 15px rgba(0,0,0,.34);transition:transform .22s,box-shadow .22s}\n.study-desk .library-window .book-card:hover .book-cover{transform:translateY(-4px) rotate(-1deg);box-shadow:-4px 4px 0 color-mix(in srgb,var(--cloth) 75%,#111),9px 17px 20px rgba(0,0,0,.4)}\n.study-desk .library-window .book-cover::after{content:\"\";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.25),rgba(255,255,255,.09) 4%,transparent 9%,transparent 97%,rgba(0,0,0,.15));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}\n.study-desk .library-window .book-cover-fallback{padding:.9rem .8rem;background:linear-gradient(120deg,rgba(255,255,255,.06),transparent 50%),repeating-linear-gradient(0deg,transparent 0 2px,rgba(0,0,0,.025) 2px 3px),var(--cloth)}\n.study-desk .library-window .book-cover-fallback strong{font:600 .83rem/1.2 Georgia,\"Times New Roman\",serif;overflow-wrap:anywhere}\n.study-desk .library-window .book-cover-fallback small{font-size:.39rem;line-height:1.4;letter-spacing:.06em}\n.study-desk .library-window .book-copy{display:flex;flex:1;flex-direction:column;padding:.9rem .2rem 0}\n.study-desk .library-window .book-copy>strong{color:#e8e3d9;font:600 1rem/1.22 Georgia,\"Times New Roman\",serif;letter-spacing:-.015em;text-wrap:pretty;overflow-wrap:anywhere}\n.study-desk .library-window .book-copy>span{margin-top:.42rem;color:#9ca397;font-size:.61rem;line-height:1.5}\n.study-desk .library-window .book-copy .book-layers{display:flex;align-items:center;flex-wrap:wrap;gap:.22rem;margin-top:.65rem}\n.study-desk .library-window .book-layers b{padding:.16rem .3rem;border:1px solid rgba(189,198,181,.07);border-radius:3px;background:rgba(166,184,161,.065);color:#a4b09f;font-size:.43rem;font-weight:650;letter-spacing:.025em}\n.study-desk .library-window .book-layers .book-kind{margin-right:.15rem;background:transparent;border-color:rgba(190,163,116,.2);color:#bdac8f}\n.study-desk .library-window .book-field .book-cover-fallback{grid-template-rows:auto 1fr auto;padding:.85rem .78rem}\n.field-cover-label{font-size:.34rem;letter-spacing:.18em;text-transform:uppercase;opacity:.78;line-height:1.4}\n.field-cover-art{position:absolute;left:0;top:12%;width:100%;height:56%;fill:none;stroke:currentColor;stroke-width:.7;opacity:.25;pointer-events:none}\n.study-desk .library-window .book-field .book-cover-fallback strong{position:relative;align-self:end;padding-bottom:.75rem;font-size:.87rem;line-height:1.16;letter-spacing:-.02em}\n.study-desk .library-window .book-field .book-cover-fallback small{position:relative;padding-top:.55rem;border-top:1px solid color-mix(in srgb,var(--foil,#f4e8cc) 28%,transparent);font-size:.35rem;letter-spacing:.08em}\n.study-desk .library-window .book-copy .field-description{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;color:#929b92;font-size:.59rem;line-height:1.55}\n.study-desk .library-window .book-copy .field-members{color:#a7b4a7}\n.field-source-half{position:absolute;inset:0;overflow:hidden;background:var(--cloth,#2a2621)}\n.field-source-half:first-child{clip-path:polygon(0 0,100% 0,0 100%)}\n.field-source-half:nth-child(2){clip-path:polygon(100% 0,100% 100%,0 100%)}\n.field-source-half:nth-child(2)>.field-member-copy,.field-source-half:nth-child(2)>img{transform:rotate(180deg)}\n.field-member-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:.85rem .7rem;border-left:5px solid #0002;background:linear-gradient(125deg,#ffffff14,transparent 35%),var(--cloth,#2a2621);color:var(--foil,#eee7d6)}\n.field-member-copy::after{content:\"\";position:absolute;inset:5%;border:1px solid currentColor;opacity:.25;pointer-events:none}\n.field-member-copy strong{position:relative;font:500 .86rem/1.06 Georgia,\"Times New Roman\",serif;overflow-wrap:anywhere}\n.field-member-copy small{position:relative;font:500 .34rem/1.4 var(--st-font,system-ui,sans-serif);letter-spacing:.08em;text-transform:uppercase}\n.field-source-half img,.field-stack-book img{position:absolute;z-index:1;inset:0;width:100%;height:100%;object-fit:cover}\n.field-split-seam{position:absolute;z-index:3;inset:0;width:100%;height:100%;stroke:#eee7d6;stroke-width:.035;fill:none;pointer-events:none}\n.field-cover-badge{position:absolute;z-index:4;right:.4rem;top:.45rem;padding:.25rem .35rem;border:1px solid #eee7d628;border-radius:9px;background:#191713eb;color:#eee7d6;font:650 .34rem/1.2 var(--st-code-font,ui-monospace,monospace);letter-spacing:.04em;white-space:nowrap}\n.study-desk .library-window .book-cover.field-stack-cover{overflow:visible;background:transparent;box-shadow:none;isolation:isolate}\n.study-desk .library-window .book-cover.field-stack-cover::after{display:none}\n.study-desk .library-window .book-card:hover .book-cover.field-stack-cover{box-shadow:none}\n.field-stack-book{position:absolute;inset:0;overflow:hidden;border:1px solid #eee7d61f;border-radius:2px 7px 7px 2px;background:var(--cloth,#2a2621);box-shadow:-4px 5px 14px #0005;transform-origin:50% 100%}\n.field-stack-book:nth-child(1){transform:translate(-6px,5px) rotate(-4deg);z-index:1}\n.field-stack-book:nth-child(2){transform:translate(7px,4px) rotate(3deg);z-index:2}\n.field-stack-book:nth-child(3){transform:translate(-3px,1px) rotate(-1.2deg);z-index:3}\n.field-stack-book:nth-child(4){z-index:4}\n.field-stack-cover .field-cover-badge{top:auto;right:-.7rem;bottom:.7rem;z-index:5;padding:.35rem .45rem;box-shadow:0 4px 10px #0004}\n.book-collection .book-object::before{content:\"\";position:absolute;top:1.25rem;left:50%;width:7.7rem;height:11.1rem;border:1px solid rgba(227,211,177,.12);border-radius:2px 6px 6px 2px;background:#383c31;transform:translateX(-43%) rotate(7deg);box-shadow:5px 9px 16px rgba(0,0,0,.2)}\n.library-back{display:inline-flex;gap:.5rem;align-items:center;margin-bottom:.75rem;padding:.3rem 0;color:#b5c2b6;font-size:.65rem}\n.library-empty{grid-column:1/-1;display:grid;justify-items:center;gap:.8rem;padding:4rem 1rem;color:#b0b6a9;text-align:center}\n.library-empty strong{color:#e9e3d7;font:500 1.6rem/1.2 Georgia,\"Times New Roman\",serif}\n.library-empty p{margin:0;font-size:.72rem;line-height:1.5}\n.library-empty button{padding:.6rem 1rem;border:1px solid var(--shelf-line);border-radius:6px;background:#202923;color:#dce4d6;cursor:pointer;font-size:.7rem}\n@media(max-width:760px){.study-desk .library-head{padding:1rem}.library-count{max-width:7rem}.library-count strong{font-size:1.2rem}.library-toolbar{padding:.65rem 1rem}.library-tabs{width:100%;margin:0}.library-tabs button{flex:0 0 auto;padding:.5rem .65rem}.library-tools{flex-wrap:wrap;gap:.45rem}.library-search{flex:1 1 100%;max-width:none}.library-sort{margin-right:auto}.library-sort>span{display:none}.library-sort select{max-width:10rem}.library-summary{padding:.75rem 1rem .25rem}.study-desk .library-grid{grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));padding:.3rem .5rem 2rem;gap:.5rem .2rem}.study-desk .library-window .book-card{padding:.7rem .5rem}.book-object{height:12rem}.study-desk .library-window .book-cover{width:7rem;height:10.5rem}.book-collection .book-object::before{width:7rem;height:10.2rem;top:1rem}.study-desk .library-window .book-copy>strong{font-size:.9rem}}\n@media(prefers-reduced-motion:reduce){.study-desk .library-window .book-card,.study-desk .library-window .book-cover{transition:none}.study-desk .library-window .book-card:hover .book-cover{transform:none}}\n\n.desk-build-version{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;flex:0 0 auto;max-width:13rem;height:2rem}\n.desk-build-version>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.desk-build-version svg{width:.8rem;height:.8rem;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}\n.desk-build-version[aria-expanded=\"true\"] svg{transform:rotate(180deg)}\n.build-version-menu{position:absolute;z-index:85;display:flex;flex-direction:column;width:19rem;max-width:calc(100% - 1rem);padding:.45rem;border:1px solid var(--desk-line);border-radius:10px;background:var(--desk-paper);color:var(--desk-ink);box-shadow:0 1rem 2.5rem #0005;font-family:var(--st-font,system-ui,sans-serif)}\n.build-version-menu-head{display:block;padding:.7rem .7rem .8rem;font:600 1.1rem/1.2 Georgia,serif;border-bottom:1px solid var(--desk-line)}\n.build-version-options{overflow:auto;overscroll-behavior:contain;min-height:0;padding-top:.3rem}\n.build-version-option{display:flex;align-items:center;gap:.75rem;width:100%;padding:.7rem;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;text-align:left;cursor:pointer}\n.build-version-copy{display:grid;gap:.25rem;flex:1;min-width:0}.build-version-copy strong{font-size:.76rem;line-height:1.3;font-weight:650}.build-version-copy small{font-size:.61rem;line-height:1.4;opacity:.6}.build-version-check{width:1rem;flex:none;text-align:center;font-size:.85rem}\n.build-version-option:hover,.build-version-option:focus-visible{outline:none;background:color-mix(in srgb,currentColor 7%,transparent);border-color:color-mix(in srgb,currentColor 22%,transparent)}\n.build-version-option[aria-checked=\"true\"]{background:color-mix(in srgb,currentColor 6%,transparent)}\n.build-version-option:disabled{opacity:.4;cursor:default;background:transparent;border-color:transparent}\n.study-desk[data-skin=\"care\"] .build-version-menu{--desk-line:#303641;background:#12161d;color:#ece8df;border-color:#363e49}\n.study-desk[data-skin=\"library\"] .build-version-menu{--desk-line:#594839;background:#251d16;color:#eee3d0;border-color:#745338}\n.study-desk[data-skin=\"classic\"] .build-version-menu{background:#dedede;color:#101010;border-radius:0;border:2px solid #555;box-shadow:3px 3px #111}\n\n/* Bookmarks belong to a reading, with one quiet control on each sheet. */\n.study-desk .pane-bookmark{display:grid;place-items:center;flex:0 0 auto;width:1.8rem;height:1.8rem;min-height:0;margin-left:.15rem;padding:.35rem;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;cursor:pointer;opacity:.7}\n.study-desk .pane-bookmark svg,.desk-bookmark-control svg,.pane-bookmark-current svg,.pane-bookmark-empty svg{width:1rem;height:1rem;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}\n.study-desk .pane-bookmark:hover,.study-desk .pane-bookmark:focus-visible{opacity:1;background:#ffffff16;border-color:#ffffff4d;outline:none}\n.study-desk .pane-bookmark[aria-pressed=\"true\"]{opacity:1;color:var(--reader-bookmark-red,#b6384f);background:transparent;box-shadow:none}\n.study-desk .pane-bookmark[aria-pressed=\"true\"] svg,.pane-bookmark-current[aria-pressed=\"true\"] svg{fill:currentColor}\n.study-desk .care-pane-minimized .pane-bookmark{display:none}\n.study-desk .desk-bookmark-control{display:inline-flex;align-items:center;justify-content:center;gap:.32rem;flex:0 0 auto;min-width:2rem;padding:.35rem .48rem}\n.desk-bookmark-control small{font:700 .52rem/1 var(--st-code-font,ui-monospace,monospace)}\n.study-desk .desk-bookmark-control[aria-expanded=\"true\"]{border-color:color-mix(in srgb,currentColor 40%,transparent);background:color-mix(in srgb,currentColor 10%,transparent)}\n.mc-level-peers{padding:.85rem .85rem 0}\n.study-desk .care-pane[data-layer=\"MC\"] .care-head>p{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}\n.pane-bookmark-menu{width:22.5rem;padding:.6rem;gap:.55rem;border-radius:12px}\n.pane-bookmark-heading{display:flex;flex:none;align-items:start;gap:.6rem;padding:.45rem .4rem .7rem;border-bottom:1px solid var(--desk-line)}\n.pane-bookmark-heading>div{flex:1;min-width:0}.pane-bookmark-heading strong{display:block;font:500 1.2rem/1.2 Georgia,serif}.pane-bookmark-heading small{display:block;margin-top:.35rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:.65rem;opacity:.6}\n.pane-bookmark-heading>button{display:grid;place-items:center;flex:none;width:1.6rem;height:1.6rem;padding:0;border:0;border-radius:5px;background:transparent;color:inherit;cursor:pointer;font-size:1.1rem;opacity:.7}\n.pane-bookmark-heading>button:hover,.pane-bookmark-heading>button:focus-visible{outline:1px solid currentColor;opacity:1}\n.pane-bookmark-current{display:flex;align-items:center;gap:.65rem;flex:none;width:100%;padding:.75rem .7rem;border:1px solid color-mix(in srgb,currentColor 17%,transparent);border-radius:8px;background:color-mix(in srgb,currentColor 5%,transparent);color:inherit;text-align:left;cursor:pointer}\n.pane-bookmark-current svg{flex:none}.pane-bookmark-current span{display:grid;gap:.25rem;min-width:0}.pane-bookmark-current strong{font-size:.69rem;font-weight:650}.pane-bookmark-current small{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:.6rem;opacity:.65}\n.pane-bookmark-current:hover,.pane-bookmark-current:focus-visible{outline:none;border-color:color-mix(in srgb,currentColor 42%,transparent);background:color-mix(in srgb,currentColor 9%,transparent)}\n.pane-bookmark-list{display:grid;gap:.25rem;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}\n.pane-bookmark-row{display:flex;align-items:center;gap:.7rem;width:100%;padding:.75rem .5rem;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer}\n.pane-bookmark-row:hover,.pane-bookmark-row:focus-visible{outline:none;background:color-mix(in srgb,currentColor 6%,transparent);border-color:color-mix(in srgb,currentColor 17%,transparent)}\n.pane-bookmark-layer{display:grid;place-items:center;flex:none;width:2.3rem;height:2.65rem;border:1px solid color-mix(in srgb,var(--bookmark-accent) 60%,transparent);border-left:3px solid var(--bookmark-accent);border-radius:3px 6px 6px 3px;background:color-mix(in srgb,var(--bookmark-accent) 14%,transparent);font:750 .6rem/1 var(--st-code-font,ui-monospace,monospace)}\n.pane-bookmark-copy{display:grid;flex:1;min-width:0;gap:.3rem}.pane-bookmark-copy strong{font:500 .87rem/1.35 Georgia,serif;overflow-wrap:anywhere}.pane-bookmark-copy small{font-size:.59rem;line-height:1.35;opacity:.6}\n.pane-bookmark-row:disabled{opacity:.4;cursor:default}.pane-bookmark-row:disabled:hover{background:transparent;border-color:transparent}\n.pane-bookmark-empty{display:grid;justify-items:center;gap:.65rem;padding:1.25rem .6rem;text-align:center}.pane-bookmark-empty svg{width:1.5rem;height:1.5rem;opacity:.6}.pane-bookmark-empty strong{font:500 1rem/1.3 Georgia,serif}.pane-bookmark-empty p{max-width:29ch;margin:0;font-size:.65rem;line-height:1.65;opacity:.6}\n.pane-bookmark-footnote{margin:0;padding:.15rem .45rem .25rem;font-size:.6rem;line-height:1.5;opacity:.55}\n\n\n/* Fine reading marks and etched actions keep attention on the axiom. */\n.study-desk{--reader-bookmark-red:#b6384f}\n.study-desk[data-skin=\"library\"],.study-desk[data-skin=\"classic\"]{--reader-bookmark-red:#94283e}\n.study-desk .pane-bookmark-current[aria-pressed=\"true\"] svg{color:var(--reader-bookmark-red)}\n.study-desk .reader-axiom-mark{position:absolute;z-index:2;right:.6rem;bottom:.48rem;display:grid;place-items:center;width:1.45rem;height:1.45rem;padding:.32rem;border:0;border-radius:4px;background:transparent;color:var(--desk-ink);opacity:.3;cursor:pointer;transition:opacity .16s,color .16s}\n.study-desk .reader-axiom-mark svg{display:block;width:.66rem;height:.8rem;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}\n.study-desk .reader-axiom-mark:hover,.study-desk .reader-axiom-mark:focus-visible{opacity:1;color:var(--reader-bookmark-red);outline:1px solid color-mix(in srgb,var(--reader-bookmark-red) 45%,transparent);outline-offset:1px}\n.study-desk .reader-axiom-mark[aria-pressed=\"true\"]{color:var(--reader-bookmark-red);opacity:1}.study-desk .reader-axiom-mark[aria-pressed=\"true\"] svg{fill:currentColor}\n.study-desk .reader-has-mark [data-select-axiom]{padding-bottom:1.15rem}.study-desk .reader-has-mark .axiom-trace{padding-right:1.7rem}\n.study-desk[data-skin] .reader-route-action{display:grid;place-items:center;position:absolute;z-index:2;top:.56rem;right:.58rem;width:1.7rem;height:1.7rem;min-height:0;padding:.38rem;border:0;border-radius:5px;background:transparent;color:var(--desk-ink);font-size:inherit;opacity:.3;box-shadow:none;transition:opacity .16s,color .16s,background .16s}\n.study-desk[data-skin] .reader-route-action[hidden]{display:none}.study-desk[data-skin] .reader-route-action:hover,.study-desk[data-skin] .reader-route-action:focus-visible{opacity:1;background:color-mix(in srgb,var(--pane-accent) 12%,transparent);color:color-mix(in srgb,var(--pane-accent) 72%,var(--desk-ink));outline:1px solid color-mix(in srgb,var(--pane-accent) 42%,transparent);outline-offset:1px}\n.study-desk .reader-route-action svg{display:block;width:1rem;height:1rem;fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 0 #0002);pointer-events:none}\n.study-desk .reader-action-tip{position:absolute;right:0;top:calc(100% + .35rem);z-index:8;padding:.3rem .5rem;border:1px solid color-mix(in srgb,var(--desk-ink) 18%,transparent);border-radius:5px;background:var(--desk-paper);color:var(--desk-ink);font:550 .59rem/1.2 var(--st-font,system-ui,sans-serif);letter-spacing:0;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;box-shadow:0 .3rem .8rem #0002;transform:translateY(-2px);transition:opacity .14s,transform .14s,visibility .14s}\n.study-desk .reader-route-action:hover .reader-action-tip,.study-desk .reader-route-action:focus-visible .reader-action-tip{opacity:1;visibility:visible;transform:translateY(0)}\n@media(prefers-reduced-motion:reduce){.study-desk .reader-axiom-mark,.study-desk[data-skin] .reader-route-action,.study-desk .reader-action-tip{transition:none}}\n\n.desk-sheet-version-slot{display:contents}.desk-sheet-version{flex-shrink:0;white-space:nowrap;text-transform:none}.desk-sheet-version span:last-child{margin-left:.4rem;opacity:.7}\n.desk-sheet-version svg{width:1.05rem;height:1.05rem;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}\n.care-head .pane-language,.source-head .pane-language{float:right;display:inline-flex;align-items:center;gap:.25rem;margin:0 0 .2rem .65rem;padding:.12rem .2rem;min-height:1.25rem;border:0;border-radius:3px;background:transparent;color:inherit;font:500 .61rem/1.3 var(--st-font,system-ui);letter-spacing:.06em;opacity:.55;cursor:pointer}\n.care-head .pane-language:hover,.source-head .pane-language:hover,.care-head .pane-language:focus-visible,.source-head .pane-language:focus-visible{opacity:1;background:color-mix(in srgb,var(--pane-accent) 12%,transparent)}\n.pane-language:focus-visible{outline:1px solid currentColor;outline-offset:2px}\n.sheet-versions{font:500 .66rem/1.4 var(--st-font,system-ui,sans-serif)}\n.sheet-version-heading{display:flex;align-items:center;gap:.75rem;padding:.35rem .25rem .5rem;border-bottom:1px solid var(--desk-line)}\n.sheet-version-heading>div{display:grid;gap:.25rem;flex:1;min-width:0}.sheet-version-heading strong{font:650 1rem/1.25 Georgia,serif}.sheet-version-heading small{opacity:.65;line-height:1.4}\n.sheet-version-heading button{border:1px solid var(--desk-line);border-radius:6px;background:transparent;color:inherit;width:1.7rem;height:1.7rem;cursor:pointer;font-size:1rem;flex-shrink:0}\n.sheet-version-popover .sheet-version-fields{margin-top:.25rem;border:0;background:transparent;padding:.65rem .25rem .3rem;overflow:auto}\n.sheet-version-popover{--pane-accent:#8ca9bd}.study-desk[data-skin=\"library\"] .sheet-version-popover{--pane-accent:#c7a672}\n.sheet-version-fields{display:grid;gap:.6rem;margin-top:.65rem;padding:.7rem;border:1px solid color-mix(in srgb,var(--pane-accent) 24%,transparent);border-radius:8px;background:var(--desk-paper)}\n.sheet-version-fields label{display:grid;gap:.3rem;min-width:0}.sheet-version-fields select{width:100%;min-height:2.1rem;min-width:0;padding:.35rem .45rem;border:1px solid var(--desk-line);border-radius:6px;background:var(--desk-paper);color:var(--desk-ink);font-size:.7rem;cursor:pointer}\n.sheet-translation-row{display:flex;gap:.5rem;align-items:end}.sheet-translation-row label{flex:1}.sheet-translation-row button{flex:0 0 auto;min-height:2.1rem;padding:.4rem .6rem;border:1px solid color-mix(in srgb,var(--pane-accent) 40%,transparent);border-radius:6px;background:color-mix(in srgb,var(--pane-accent) 12%,var(--desk-paper));color:inherit;font-weight:650;cursor:pointer}\n.sheet-version-fields small{line-height:1.45;opacity:.72}.sheet-versions select:focus-visible,.sheet-versions button:focus-visible{outline:2px solid var(--pane-accent,var(--st-primary-color,#b56f3b));outline-offset:2px}.sheet-versions :disabled{opacity:.5;cursor:default}\n.study-desk[data-skin=\"care\"] .desk-build-version select,.study-desk[data-skin=\"care\"] .sheet-version-fields,.study-desk[data-skin=\"care\"] .sheet-version-fields select{background:#171c23;color:#e4e6e8;border-color:#303641}\n.study-desk[data-skin=\"library\"] .sheet-version-fields select{background:#251d16;color:#eee3d0;border-color:#745338}\n@media(max-width:760px){.sheet-translation-row{flex-wrap:wrap}.sheet-translation-row label{min-width:8rem}}\n.desk-toolbar:has(.connection-controls){flex-wrap:nowrap;gap:.4rem;min-width:0;overflow:hidden}\n.desk-toolbar:has(.connection-controls) .desk-title{flex:0 1 19rem;min-width:10rem;max-width:28rem}.desk-toolbar .desk-title strong{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;line-height:1.15}\n.connection-controls{display:flex;align-items:center;gap:.3rem;flex:0 1 auto;min-width:0}\n.connection-controls>.desk-action{flex-shrink:0;white-space:nowrap}\n.connection-choice{display:block;flex:0 1 8.5rem;min-width:4.5rem;max-width:10rem}.connection-choice>span{position:absolute;clip:rect(0,0,0,0);width:1px;height:1px;overflow:hidden}\n.connection-choice select{width:100%;max-width:100%;min-height:2rem;padding:.35rem .5rem;border:1px solid var(--desk-line);border-radius:7px;background:var(--desk-paper);color:var(--desk-ink);font:600 .65rem/1.2 var(--st-font,system-ui,sans-serif);text-overflow:ellipsis;cursor:pointer}\n.connection-tab-rail{display:flex;align-items:center;gap:.2rem;flex:1 1 12rem;min-width:4.5rem;overflow:hidden}\n.connection-tab-rail>.desk-tabs{flex:1 1 0;min-width:0;margin-left:0;overflow-x:auto;scrollbar-width:none}\n.connection-tab-rail .desk-tab{flex-shrink:0;max-width:10rem;overflow:hidden;text-overflow:ellipsis}\n.connection-tab-scroll{flex:0 0 1.3rem;width:1.3rem;min-height:2rem;padding:0;border:0;background:transparent;color:inherit;font-size:1rem;cursor:pointer}\n.connection-tab-scroll:disabled{opacity:.22;cursor:default}\n.desk-toolbar:has(.connection-controls)>.desk-skin,.desk-toolbar:has(.connection-controls)>.desk-text-size,.desk-toolbar:has(.connection-controls)>.desk-nav{flex-shrink:0}\n.connection-edition-label{display:block;margin-bottom:.4rem;font-size:.6rem;line-height:1.4;opacity:.65}\n.connection-edition{margin:0;padding:.65rem 1rem;border-bottom:1px solid var(--desk-line);font-size:.65rem;line-height:1.5;color:inherit;opacity:.8}\n.study-desk[data-skin=\"care\"] .connection-choice select{background:#171c23;color:#e4e6e8;border-color:#303641}\n.study-desk[data-skin=\"care\"] .connection-controls .desk-action{background:#171c23;color:#e4e6e8;border-color:#303641}\n.study-desk .desk-strip.lateral-route-three{gap:.8rem}\n.study-desk .desk-strip.lateral-route-three>.desk-window{flex:0 0 max(20rem,calc((100% - 1.6rem)/3));min-width:20rem}\n@media(max-width:760px){.desk-toolbar:has(.connection-controls){overflow-x:auto}.connection-tab-rail>.desk-tabs{display:flex}.connection-tab-rail{flex-shrink:0;min-width:7rem}.desk-toolbar:has(.connection-controls) .desk-title{min-width:5rem}}\n.desk-toolbar,.desk-toolbar:has(.connection-controls){gap:.75rem;overflow:visible}\n.desk-toolbar .desk-title,.desk-toolbar:has(.connection-controls) .desk-title{flex:1 1 16rem;min-width:8rem;max-width:none}\n.desk-reader-controls{display:flex;align-items:center;justify-content:flex-end;gap:.28rem;min-width:0;flex:0 1 auto;margin-left:auto}\n.desk-reader-controls>.desk-tabs{flex:0 0 auto;margin-left:.32rem;display:flex}\n.desk-reader-controls>.desk-skin,.desk-reader-controls>.desk-text-size,.desk-reader-controls>.desk-nav{flex-shrink:0}\n.desk-reader-controls .connection-tab-rail{flex:1 1 10rem;min-width:5rem;max-width:30rem}\n.desk-reader-controls .desk-build-version:focus-visible,.desk-reader-controls .connection-discovery-button:focus-visible{outline:2px solid #8ca9bd;outline-offset:2px}\n@media(max-width:1100px){.desk-toolbar,.desk-toolbar:has(.connection-controls){flex-wrap:wrap}.desk-toolbar .desk-title,.desk-toolbar:has(.connection-controls) .desk-title{flex-basis:100%}.desk-reader-controls{max-width:100%;justify-content:flex-start;overflow-x:auto;scrollbar-width:thin;padding:3px 0}.desk-reader-controls .connection-tab-rail{flex-shrink:0;min-width:9rem}.desk-reader-controls>.desk-text-size{margin-left:0}}\n/* Track scale is separate from text size; the viewer keeps its own bounds. */\n.study-desk .desk-strip[data-track-scaled]>.desk-window{zoom:var(--desk-track-scale);height:calc(100% / var(--desk-track-scale))}\n.study-desk .desk-strip[data-track-scaled] .window-titlebar{cursor:zoom-in}\n.desk-track-zoom{display:flex;align-items:center;gap:.2rem;flex:0 0 auto;margin-left:auto}\n.study-desk .desk-track-zoom .desk-tab{height:1.5rem;min-height:1.5rem;padding:.2rem .42rem;font-size:.56rem;line-height:1}\n.desk-track-zoom [data-track-zoom=\"out\"],.desk-track-zoom [data-track-zoom=\"in\"]{min-width:1.6rem;font-size:.85rem!important}\n.desk-track-zoom [data-track-zoom=\"read\"]{min-width:3.2rem;font-variant-numeric:tabular-nums}\n.desk-track-zoom button:disabled{opacity:.35;cursor:default}\n.desk-track-zoom button:focus-visible{outline:2px solid #8ca9bd;outline-offset:2px}\n.desk-status:has(.desk-track-zoom) .status-help{margin-left:0;min-width:0;flex:0 1 auto}\n.desk-status:has(.desk-track-zoom) .status-cell.focus{min-width:0;overflow:hidden;text-overflow:ellipsis}\n@media(max-width:1100px){.desk-status:has(.desk-track-zoom) .status-help{display:none}}\n@media(max-width:600px){.desk-status:has(.desk-track-zoom)>.status-cell:not(.focus){display:none}}\n\n.study-desk[data-skin=\"care\"] [data-connection-resolution]{background:#171c23;color:#e4e6e8;border-color:#303641;max-width:11rem;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}\n.field-desk{--desk-paper:#141920;--desk-ink:#e8e3d8;--desk-line:#39414b}.field-desk [data-connection-resolution]{border:1px solid #303641;border-radius:6px;background:#171c23;color:#e8e3d8;padding:8px 10px;font-size:11px}\n.connection-resolution-panel{position:absolute;z-index:70;top:4.3rem;right:1rem;width:min(29rem,calc(100% - 2rem));max-height:calc(100% - 6rem);overflow:auto;padding:1.1rem;border:1px solid var(--desk-line);border-radius:12px;background:var(--desk-paper);color:var(--desk-ink);box-shadow:0 18px 52px #0007;font:400 .78rem/1.5 var(--st-font,system-ui,sans-serif)}\n.study-desk[data-skin=\"care\"] .connection-resolution-panel{background:#141920;color:#e8e3d8;border-color:#39414b}\n.connection-resolution-panel header{display:flex;align-items:center;justify-content:space-between;gap:.8rem}.connection-resolution-panel h3{margin:0;font:600 1.4rem/1.2 Georgia,serif}.connection-resolution-panel p{color:inherit;opacity:.7;font-size:.72rem;margin:.6rem 0 1rem}\n.connection-resolution-presets{display:flex;gap:.5rem;margin:.7rem 0 1rem}.connection-resolution-panel button{border:1px solid var(--desk-line);border-radius:7px;background:transparent;color:inherit;padding:.45rem .7rem;cursor:pointer;font:600 .72rem/1.3 var(--st-font,system-ui,sans-serif)}\n.connection-resolution-panel button:hover,.connection-resolution-panel button:focus-visible{background:#7772;outline:2px solid #7775}.connection-resolution-panel details{border-top:1px solid #7774;padding:.5rem 0}.connection-resolution-panel summary{display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:700}.connection-resolution-panel summary button{padding:.25rem .45rem;font-size:.65rem}.connection-resolution-panel label{display:flex;align-items:flex-start;gap:.6rem;padding:.48rem .25rem;cursor:pointer}.connection-resolution-panel input{margin:.2rem 0 0;accent-color:#8b7160}.connection-resolution-panel label span{display:grid;min-width:0}.connection-resolution-panel small{opacity:.6;font-size:.62rem;overflow-wrap:anywhere}.connection-resolution-panel footer{position:sticky;bottom:-1.1rem;background:inherit;padding:.8rem 0 .2rem;margin-top:.5rem;display:flex;justify-content:flex-end}.connection-resolution-panel footer button{background:#e8e3d8;color:#171c23;border-color:#e8e3d8}.connection-resolution-panel .resolution-metrics{font-size:.67rem;opacity:.7}\n.resolution-depth{margin:1rem 0 1.4rem;padding:.8rem .1rem .2rem}.resolution-depth-heading{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.9rem;font-size:.7rem}.resolution-depth-heading output{font-weight:700;color:var(--resolution-accent,#ad9971)}.resolution-depth-rail{position:relative;height:2.9rem;margin:0 .5rem}.resolution-depth-rail:before{content:\"\";position:absolute;top:.48rem;left:0;right:0;height:2px;background:var(--resolution-gradient,linear-gradient(90deg,#a895be,#9a4327,#594f88,#2d6b67,#3d668b,#8a431d))}\n.connection-resolution-panel .resolution-depth-rail input{position:absolute;inset:-.25rem -.5rem auto;width:calc(100% + 1rem);height:1.5rem;margin:0;appearance:none;background:transparent;z-index:2;cursor:pointer;accent-color:var(--resolution-accent,#ad9971)}.resolution-depth-rail input::-webkit-slider-runnable-track{height:2px;background:transparent}.resolution-depth-rail input::-webkit-slider-thumb{appearance:none;margin-top:-.43rem;width:1rem;height:1rem;border-radius:50%;border:3px solid var(--desk-paper,#141920);background:var(--resolution-accent,#ad9971);box-shadow:0 0 0 2px var(--resolution-accent,#ad9971)}.resolution-depth-rail input::-moz-range-thumb{width:.7rem;height:.7rem;border-radius:50%;border:3px solid #141920;background:var(--resolution-accent,#ad9971);box-shadow:0 0 0 2px var(--resolution-accent,#ad9971)}\n.resolution-depth-stops{position:absolute;inset:0;display:flex;justify-content:space-between}.connection-resolution-panel .resolution-depth-stop{position:relative;width:0;padding:1.3rem 0 0;border:0;border-radius:0;background:transparent;overflow:visible;white-space:nowrap;color:var(--stop-color);font:700 .6rem/1.3 var(--st-code-font,monospace);outline-offset:4px}.resolution-depth-stop span{display:block;width:max-content;transform:translateX(-50%)}.resolution-depth-stop:before{content:\"\";position:absolute;top:.3rem;left:-.21rem;width:.42rem;height:.42rem;border:1px solid var(--stop-color);border-radius:50%;background:var(--stop-color)}.resolution-depth-stop[aria-current=\"true\"] span{color:var(--desk-ink,#e8e3d8)}.connection-resolution-panel .resolution-unit-title{display:flex;align-items:center;gap:.5rem}.resolution-unit-title i{width:.45rem;height:.45rem;display:inline-block;border-radius:50%;background:var(--stop-color)}.resolution-custom>summary{padding:.35rem 0}.resolution-custom details{margin-left:.2rem}.connection-resolution-panel .resolution-custom-actions{display:flex;justify-content:flex-end;margin:.4rem 0}.resolution-availability{margin-top:.25rem!important;font-size:.65rem!important}\n\n/* Range geometry must stay independent of the reader's ordinary input box. */\n.connection-resolution-panel .resolution-depth-rail input[type=\"range\"]{box-sizing:border-box;border:0!important;border-radius:0!important;padding:0!important;background:transparent!important;box-shadow:none;min-width:0;min-height:0;max-width:none;line-height:normal}\n.connection-resolution-panel .resolution-depth-stop:first-child span{transform:none}\n.connection-resolution-panel .resolution-depth-stop:last-child span{transform:translateX(-100%)}\n\n\n.care-pane-controls{display:flex;align-items:center;gap:.4rem;flex:0 0 auto;margin-right:.7rem}\n.care-pane-controls button{display:grid;place-items:center;position:relative;width:1rem;height:1rem;min-height:0;padding:0;border:1px solid #0003;border-radius:50%;color:#35251d;background:color-mix(in srgb,#cf8a72 88%,var(--pane-accent,var(--color,#736486)));cursor:pointer;box-shadow:inset 0 1px 1px #ffffff25}\n.care-pane-controls button:nth-child(2){background:color-mix(in srgb,#c7b174 88%,var(--pane-accent,var(--color,#736486)))}\n.care-pane-controls svg{display:block;width:.62rem;height:.62rem;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;opacity:.5}.care-pane-controls:hover svg,.care-pane-controls button:focus-visible svg{opacity:1}\n.care-pane-controls button:hover,.care-pane-controls button:focus-visible{filter:brightness(1.3);outline:2px solid #fff8;outline-offset:2px}\n.window-titlebar:has(.care-pane-controls)>strong,.pane-top:has(.care-pane-controls)>strong{margin-left:auto;text-align:right;min-width:0;flex:1}\n.window-titlebar:has(.care-pane-controls)>span,.pane-top:has(.care-pane-controls)>small,.pane-top:has(.care-pane-controls)>button{display:none!important}\n[data-pane]:has(.care-pane-controls) .sheet-actions,[data-pane]:has(.care-pane-controls) [data-sheet-sections],[data-pane]:has(.care-pane-controls) [data-sections]{display:none!important}\n.desk-window.care-pane-minimized,.field-pane.care-pane-minimized{flex:0 0 var(--care-folded-width,2.6rem)!important;width:var(--care-folded-width,2.6rem)!important;min-width:var(--care-folded-width,2.6rem)!important}\n.care-pane-minimized>.window-titlebar,.care-pane-minimized>.pane-top{position:relative;height:100%!important;display:flex!important;flex-direction:column;align-items:center;padding:calc(var(--care-controls-top,1rem) + 2rem) .35rem .7rem;gap:1rem;border:0}\n.care-pane-minimized .care-pane-controls{position:absolute;top:var(--care-controls-top,1rem);left:var(--care-controls-left,.75rem)}\n.care-pane-minimized>:not(.window-titlebar):not(.pane-top){display:none!important}.care-pane-minimized .care-pane-controls{margin:0}.care-pane-minimized .care-pane-controls button:not(:first-child){display:none}.care-pane-minimized>.window-titlebar>strong,.care-pane-minimized>.pane-top>strong{writing-mode:vertical-rl;margin:0!important;text-align:left!important;align-self:center;flex:0 1 auto;white-space:nowrap;max-height:calc(100% - 4rem)}\n\n.connection-discovery-pane[hidden]{display:none!important}\n.connection-discovery-controls{display:flex;flex-flow:row nowrap;align-items:center;gap:.35rem;flex:0 0 auto;min-width:0}\n.study-desk .connection-discovery-button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 2rem;width:2rem;height:2rem;min-height:2rem;padding:0;white-space:nowrap;cursor:pointer}\n.study-desk .connection-discovery-button[aria-expanded=\"true\"]{border-color:#7f9aaf;background:#202833}\n.connection-discovery-button svg{width:.95rem;height:.95rem;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}\n.connection-discovery-button .discovery-chevron{width:.65rem;height:.65rem;margin-left:.1rem;opacity:.55}\n.connection-discovery-button small{display:grid;place-items:center;min-width:1.05rem;height:1.05rem;padding:0 .15rem;border-radius:4px;background:#ffffff0b;color:#cab58e;font-size:.57rem;font-variant-numeric:tabular-nums}\n.study-desk .connection-discovery-button:focus-visible,.connection-discovery-popover button:focus-visible,.connection-discovery-pane button:focus-visible{outline:2px solid #c6a36b;outline-offset:3px}\n.connection-discovery-popover{position:absolute;z-index:80;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;width:min(26rem,calc(100% - 1rem));max-height:32rem;border:1px solid #575145;border-radius:10px;background:#12161c;color:#eee8dc;box-shadow:0 1rem 3rem #0008,0 0 0 1px #0003}\n.discovery-popover-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1rem .6rem}\n.discovery-popover-head strong{font:600 1.25rem/1.2 Georgia,serif;letter-spacing:-.015em}\n.discovery-popover-close{display:grid;place-items:center;width:1.7rem;height:1.7rem;padding:0;border:1px solid #343a43;border-radius:5px;background:transparent;color:#b8b7b1;font:1.1rem/1 system-ui;cursor:pointer}\n.discovery-search{position:relative;display:flex;align-items:center;margin:.2rem 1rem .8rem;border:1px solid #363b43;border-radius:6px;background:#0d1116;flex:0 0 auto}\n.discovery-search svg{width:1rem;height:1rem;margin-left:.7rem;fill:none;stroke:#a99b85;stroke-width:1.6;flex-shrink:0}\n.discovery-search input{box-sizing:border-box;width:100%;min-width:0;height:2.45rem;padding:.5rem .7rem;border:0;outline:none;background:transparent;color:#eee9df;font:.76rem/1.3 var(--st-font,system-ui,sans-serif)}\n.discovery-search:focus-within{border-color:#a98c60;box-shadow:0 0 0 2px #b9945a1a}.discovery-search input::placeholder{color:#777e88}\n.discovery-results{min-height:0;overflow:auto;padding:0 .5rem .55rem;overscroll-behavior:contain}\n.discovery-result-group{margin:0 0 .35rem}.discovery-result-group>h3{margin:0;padding:.65rem .55rem .4rem;font:600 .55rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:.13em;text-transform:uppercase;color:#b19a73}\n.discovery-result{display:flex;align-items:center;gap:.75rem;width:100%;padding:.65rem .6rem;text-align:left;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;cursor:pointer}\n.discovery-result:hover,.discovery-result:focus-visible{border-color:#3c4148;background:#1b2027}.discovery-result-copy{display:grid;gap:.22rem;min-width:0;flex:1}\n.discovery-result-copy strong{font:500 .87rem/1.3 Georgia,serif;color:#f0eade;overflow-wrap:anywhere}.discovery-result-copy small{font:.62rem/1.4 var(--st-font,system-ui,sans-serif);color:#929ba5;overflow-wrap:anywhere}.discovery-result>i{font-style:normal;color:#b3976d;font-size:.9rem}\n.discovery-mini-cover{position:relative;display:block;flex:0 0 2.2rem;width:2.2rem;height:3rem;overflow:hidden;border:1px solid #ffffff15;border-radius:2px 4px 4px 2px;background:var(--cloth,#353128);color:var(--foil,#e9dec4);box-shadow:inset 3px 0 #0003,2px 3px 5px #0005}\n.discovery-mini-cover img{display:block;width:100%;height:100%;object-fit:cover}.discovery-mini-cover>span{display:block;padding:.5rem .22rem;font:600 .37rem/1.3 Georgia,serif;text-align:center;overflow:hidden;overflow-wrap:anywhere}\n.discovery-empty{margin:0;padding:1rem .65rem 1.25rem;color:#969da6;font:.75rem/1.6 var(--st-font,system-ui,sans-serif)}\n.study-desk .connection-discovery-pane{--pane-accent:#8e7147;flex-basis:min(39rem,calc(100vw - 7rem));min-width:30rem}\n.connection-discovery-pane .window-body{padding-bottom:1.25rem}.connection-discovery-head{padding:1.8rem 1.6rem 1.3rem;border-bottom:1px solid #2c323b}\n.connection-discovery-head .pane-kicker{color:#b69a6f}.connection-discovery-head h2{margin:.5rem 0 .65rem;color:#efe8d9;font:600 2rem/1.1 Georgia,serif;letter-spacing:-.03em}.connection-discovery-head p{margin:0;max-width:31rem;color:#a1a6ad;font:.79rem/1.65 var(--st-font,system-ui,sans-serif)}\n.connection-discovery-pane .discovery-search{margin:1.15rem 1.4rem .4rem}.discovery-shelf-results{padding:.4rem 1.3rem}.discovery-shelf-section{margin:1.1rem 0 1.5rem}.discovery-shelf-section>h3{display:flex;align-items:center;justify-content:space-between;margin:0 0 .9rem;color:#c4ad86;font:600 .61rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:.13em;text-transform:uppercase}.discovery-shelf-section>h3 small{color:#818993;letter-spacing:0}\n.discovery-saved-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem .8rem}.discovery-saved-card{display:flex;flex-direction:column;align-items:stretch;gap:.8rem;min-width:0;padding:1rem .8rem .85rem;border:1px solid #2b313a;border-radius:7px;background:linear-gradient(155deg,#191c21,#10141b);color:#e8e2d6;text-align:left;cursor:pointer}.discovery-saved-card:hover{border-color:#806a4c;background:linear-gradient(155deg,#25241f,#15191e)}\n.discovery-cover-object{display:flex;justify-content:center;align-items:center;height:10rem;overflow:visible}.discovery-cover-object .book-cover{position:relative;display:block;width:6.2rem;height:9rem;transform:rotate(-3deg);transform-origin:center bottom;border-radius:2px 6px 6px 2px;box-shadow:-3px 4px 12px #0005}.discovery-cover-object .field-stack-cover{transform:rotate(-2deg);overflow:visible;background:transparent;box-shadow:none;isolation:isolate}.discovery-cover-object .field-stack-cover::after{display:none}\n.discovery-saved-copy{display:grid;gap:.35rem;min-width:0}.discovery-saved-copy strong{font:600 1rem/1.25 Georgia,serif;overflow-wrap:anywhere}.discovery-saved-copy>span{color:#909aa4;font:.63rem/1.4 var(--st-font,system-ui,sans-serif)}.discovery-saved-copy>small{color:#c3a77b;font:500 .56rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:.045em}\n.discovery-shelf-section .discovery-result{border-top:1px solid #272d35;border-radius:0;padding:.8rem .2rem}.discovery-shelf-section .discovery-empty{padding-left:0}.discovery-shelf-section .discovery-more{color:#84909b;font:.68rem/1.5 var(--st-font,system-ui,sans-serif);padding:.5rem .2rem}\n@media(max-width:760px){.connection-discovery-controls{gap:.2rem}.study-desk .connection-discovery-pane{flex-basis:calc(100vw - 3rem);min-width:calc(100vw - 3rem)}.connection-discovery-head{padding:1.35rem 1.1rem}.discovery-shelf-results{padding:.4rem 1rem}}\n\n.desk-view{display:flex;align-items:center;gap:2px;padding:3px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:6px;flex:0 0 auto}\n.desk-view button{border:0;border-radius:4px;padding:.43rem .52rem;background:transparent;color:inherit;font-size:.57rem;font-weight:800;cursor:pointer}\n.desk-view button.active{background:#eee8dc;color:#151920}.desk-view button:focus-visible{outline:2px solid var(--pane-accent,#5989a8);outline-offset:1px}\n.study-desk .desk-toolbar:has(.desk-view){flex-wrap:wrap;height:auto}\n.study-desk .desk-toolbar:has(.desk-view)>.route-toolbar{flex-shrink:0}\n.study-desk .desk-toolbar:has(.desk-view)>.desk-reader-controls{max-width:100%;overflow-x:auto;scrollbar-width:thin}\n.study-desk[data-view=\"outline\"] .status-help{display:none}\n.study-desk[data-view=\"outline\"] .desk-status{padding-right:10.75rem}\n.outline-tools{display:flex;align-items:center;gap:.5rem;margin-left:auto;font-size:.56rem}\n.outline-tools[hidden]{display:none}.outline-tools button{font-size:.54rem}.outline-tools span{opacity:.65}\n.study-desk[data-view=\"outline\"] .desk-strip{gap:1.2rem;scroll-snap-type:none}\n.study-desk[data-view=\"outline\"] .desk-window.outline-lane{display:flex;flex-direction:column;flex:0 0 28rem;min-width:28rem;border:0;background:transparent;box-shadow:none;overflow:visible;filter:none;opacity:1}\n.outline-lane-head{display:flex;align-items:center;gap:.5rem;min-height:2.7rem;padding:.4rem .55rem .65rem;border-bottom:1px solid color-mix(in srgb,var(--pane-accent) 35%,transparent);font-size:.64rem;letter-spacing:.07em}\n.outline-lane-head strong{color:var(--pane-accent)}.outline-lane-head span{margin-left:auto;opacity:.6;font-size:.53rem;letter-spacing:0}.outline-lane-head button{border:0;background:transparent;color:inherit;opacity:.65;cursor:pointer;padding:.3rem;font-size:.55rem}\n.study-desk[data-view=\"outline\"] .outline-lane>.window-body{height:auto;flex:1;min-height:0;background:transparent;padding:.65rem .15rem 2rem;overflow:auto;scrollbar-gutter:stable;overflow-anchor:none}\n.outline-sheet{margin:0 0 .65rem;border:1px solid color-mix(in srgb,var(--pane-accent) 40%,transparent);border-radius:8px;background:var(--desk-paper);overflow:clip;transition:border-color .15s ease}\n.study-desk .outline-strip{border-radius:0;display:flex;align-items:center;gap:.65rem;width:100%;min-height:3rem;padding:.7rem .8rem;border:0;background:linear-gradient(105deg,color-mix(in srgb,var(--pane-accent) 96%,#fff),color-mix(in srgb,var(--pane-accent) 90%,#111));color:#fff;text-align:left;cursor:pointer;font-family:var(--st-code-font,ui-monospace,monospace);font-size:.65rem;line-height:1.45;font-weight:800;letter-spacing:.035em}\n.outline-strip:hover{filter:brightness(1.12)}.outline-strip:focus-visible{outline:2px solid #e9dbc0;outline-offset:-4px}\n.outline-fold{display:grid;place-items:center;flex:0 0 1.05rem;height:1.05rem;border-radius:50%;background:#d79576;color:#533c31;box-shadow:inset 0 0 0 1px #ffffff30;font:600 .8rem/1 sans-serif}\n.outline-strip-title{min-width:0;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-wrap:pretty}.outline-order{opacity:.66;font-weight:500;font-size:.54rem}.outline-route-count{display:grid;place-items:center;min-width:1.25rem;height:1.25rem;padding:0 .25rem;border-radius:4px;background:#1118209c;color:#fff;font:800 .52rem/1 var(--st-font,system-ui)}\n.outline-sheet.outline-on-route{border-color:color-mix(in srgb,var(--pane-accent) 80%,#e9dbc0);box-shadow:0 0 0 1px color-mix(in srgb,var(--pane-accent) 22%,transparent)}\n.outline-sheet.outline-related{box-shadow:0 0 0 2px color-mix(in srgb,var(--pane-accent) 75%,#fff)}\n.outline-content[hidden]{display:none}.outline-content{padding:0;background:var(--desk-paper)}\n.study-desk[data-view=\"outline\"] .outline-content .source-layout{display:block;min-height:0}.study-desk[data-view=\"outline\"] .outline-content .source-copy{padding:1.4rem 1.15rem 1.8rem}\n.study-desk[data-view=\"outline\"] .outline-content .source-head h2{font-size:1.8rem}\n.study-desk[data-view=\"outline\"] .outline-content .care-head{padding:1.05rem}.study-desk[data-view=\"outline\"] .outline-content .care-sections{padding:.6rem}\n.outline-load-note{margin:0;padding:1rem;color:inherit;opacity:.7;font-size:.65rem;line-height:1.6}.outline-load-note button{margin-left:.5rem;cursor:pointer}\n.outline-close-bottom{display:block;width:100%;border:0;border-top:1px solid color-mix(in srgb,var(--pane-accent) 30%,transparent);background:transparent;color:var(--pane-accent);padding:.8rem;font-size:.58rem;cursor:pointer;text-align:center}\n.outline-empty{opacity:.55;padding:1rem;font-size:.7rem}.outline-thread-overlay{position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;overflow:hidden}\n.outline-thread{fill:none;stroke-width:1.2;opacity:.55}.outline-thread.active{stroke-width:2;opacity:.95}.outline-port{stroke-width:1.4;fill:var(--desk-paper)}\n.study-desk[data-skin=\"care\"] .outline-sheet,.study-desk[data-skin=\"care\"] .outline-content{--desk-paper:#0e1117;background:#0e1117}\n.study-desk[data-skin=\"care\"] .outline-lane-head{color:#ddd8cb}.study-desk[data-skin=\"care\"] .outline-lane-head strong{color:color-mix(in srgb,var(--pane-accent) 58%,#eee8dc)}\n.study-desk[data-skin=\"classic\"] .outline-sheet{border-radius:0;border:2px solid #333}.study-desk[data-skin=\"classic\"] .desk-view button.active{background:#001d67;color:#fff}\n@media(max-width:760px){.study-desk[data-view=\"outline\"] .desk-window.outline-lane{flex-basis:calc(100vw - 3.5rem);min-width:calc(100vw - 3.5rem)}.outline-tools span{display:none}}\n@media(max-width:1400px){.outline-tools>span{display:none}}\n@media(prefers-reduced-motion:reduce){.outline-sheet{transition:none}}\n\n.study-desk[data-dialogue-ready=\"true\"]{grid-template-rows:auto minmax(0,1fr) auto auto}\n.dialogue-pane .window-body{padding:1.2rem;background:var(--desk-paper)}\n.dialogue-pane-intro{margin:0 0 1rem;font-size:.68rem;line-height:1.6;opacity:.68}\n.dialogue-media-slot{width:100%;aspect-ratio:16/9;border-radius:5px;background:#080b0f}\n.dialogue-media-slot[data-media-kind=\"audio\"]{aspect-ratio:auto;height:4rem;background:transparent}\n.dialogue-media-host{position:absolute;z-index:6;overflow:hidden;background:#080b0f;border-radius:5px}\n.dialogue-media-host video{display:block;width:100%;height:100%;object-fit:contain;background:#080b0f}\n.dialogue-media-host audio{display:block;width:100%;height:100%}\n.dialogue-media-host[data-parked=\"true\"]{opacity:0;pointer-events:none;width:1px!important;height:1px!important;left:0!important;top:0!important;clip-path:inset(100%)}\n.dialogue-caption{margin:1.3rem 0 0;padding-top:1rem;border-top:1px solid color-mix(in srgb,currentColor 17%,transparent)}\n.dialogue-caption small{font-size:.58rem;letter-spacing:.08em;opacity:.6}\n.dialogue-caption p{margin:.65rem 0;font:1.08rem/1.6 Georgia,\"Times New Roman\",serif;text-wrap:pretty}\n.dialogue-timing-note{font-size:.59rem;line-height:1.6;opacity:.58}\n.dialogue-exchange-pane .window-body{padding:0;background:var(--desk-paper)}\n.dialogue-exchange-pane .care-section>summary{white-space:normal;line-height:1.55;text-transform:none;font-size:.76rem;letter-spacing:0}\n.dialogue-exchange-pane .dialogue-exchange-entry{padding:1.2rem}.dialogue-exchange-entry.dialogue-speaking{box-shadow:inset 3px 0 #b49264;background:color-mix(in srgb,#b49264 8%,transparent)}\n.dialogue-exchange-controls{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.75rem;border-bottom:1px solid color-mix(in srgb,currentColor 16%,transparent);background:var(--desk-paper);font-size:.6rem}\n.dialogue-exchange-controls button{padding:.4rem .55rem;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:5px;background:transparent;color:inherit;font:inherit;cursor:pointer}\n.dialogue-exchange-controls button[aria-pressed=\"true\"]{background:color-mix(in srgb,#b49264 16%,transparent)}\n.dialogue-exchange-phase{display:block;margin:.15rem 0 1.45rem;font:.55rem/1.5 var(--st-code-font,ui-monospace,monospace);letter-spacing:.11em;text-transform:uppercase;opacity:.65}\n.dialogue-exchange-question{margin:0 0 1.3rem;font:500 1.35rem/1.3 Georgia,\"Times New Roman\",serif;text-wrap:pretty}\n.dialogue-exchange-voice{margin:1.1rem 0 .5rem;font:600 1.1rem/1.35 Georgia,\"Times New Roman\",serif}\n.dialogue-exchange-kind{font:.5rem/1.5 var(--st-code-font,ui-monospace,monospace);letter-spacing:.09em;text-transform:uppercase;opacity:.56}\n.dialogue-exchange-text{margin:.5rem 0 1rem;font:1.08rem/1.65 Georgia,\"Times New Roman\",serif;text-wrap:pretty}\n.dialogue-exchange-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin:1rem 0 1.5rem}\n.dialogue-exchange-actions button,.dialogue-care-evidence{padding:.45rem .6rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:5px;background:transparent;color:inherit;font-size:.61rem;line-height:1.4;cursor:pointer;text-align:left}\n.dialogue-exchange-actions button:hover,.dialogue-care-evidence:hover{background:color-mix(in srgb,currentColor 8%,transparent)}\n.dialogue-exchange-care{margin:1.4rem 0 0;padding-top:1.2rem;border-top:1px solid color-mix(in srgb,currentColor 17%,transparent)}\n.dialogue-exchange-care>small{font:.52rem/1.5 var(--st-code-font,ui-monospace,monospace);letter-spacing:.08em;opacity:.6}\n.dialogue-exchange-care article{margin:1.2rem 0}.dialogue-exchange-care article>small{font-size:.58rem;opacity:.65}.dialogue-exchange-care p{font:1rem/1.6 Georgia,\"Times New Roman\",serif;margin:.6rem 0}\n.dialogue-exchange-entry+.dialogue-exchange-entry{border-top:1px solid color-mix(in srgb,currentColor 17%,transparent);margin-top:1.5rem;padding-top:1.5rem}\n.study-desk[data-skin=\"care\"] .dialogue-exchange-pane .window-body{background:#0e1117;color:#e7e2d7}\n.dialogue-dock{display:flex;align-items:center;gap:.65rem;min-height:3.2rem;padding:.55rem .85rem;border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);background:var(--desk-paper);color:var(--desk-ink);font-size:.64rem}\n.dialogue-dock button,.dialogue-dock select{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:6px;background:transparent;color:inherit;min-height:1.85rem;padding:.25rem .55rem;cursor:pointer;white-space:nowrap;font:inherit}\n.dialogue-dock button:hover,.dialogue-dock button:focus-visible{background:color-mix(in srgb,currentColor 10%,transparent)}\n.dialogue-dock [data-dialogue-play]{width:2rem;padding:.25rem;flex:0 0 auto}\n.dialogue-dock svg{display:block;width:1rem;height:1rem;fill:currentColor;margin:auto}\n.dialogue-dock-title{min-width:0;max-width:17rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dialogue-dock input[type=\"range\"]{flex:1;min-width:4rem;max-width:30rem;accent-color:#b49264;cursor:pointer}\n.dialogue-dock-time{font: .59rem var(--st-code-font,ui-monospace,monospace);white-space:nowrap;font-variant-numeric:tabular-nums}\n.dialogue-dock [data-dialogue-follow][aria-pressed=\"true\"]{border-color:#9a7b54;background:color-mix(in srgb,#b49264 12%,transparent)}\n.dialogue-playback-error{font-size:.6rem;color:#cf947d}\n.passage.dialogue-speaking,.route-source-card.dialogue-speaking{box-shadow:inset 3px 0 #b49264;background:linear-gradient(90deg,color-mix(in srgb,#b49264 17%,transparent),transparent 85%)}\n.dialogue-passage-time{margin-left:.7rem;color:inherit;opacity:.68;font-weight:500;font-variant-numeric:tabular-nums}\n.study-desk[data-skin=\"care\"] .dialogue-dock,.study-desk[data-skin=\"care\"] .dialogue-pane .window-body{background:#0e1117;color:#e7e2d7}\n.study-desk[data-skin=\"library\"] .dialogue-dock{background:#f8f1e6;color:#2d2822}\n.study-desk[data-skin=\"classic\"] .dialogue-dock{background:#cecece;color:#111}\n@media(max-width:900px){.dialogue-dock-title{display:none}.dialogue-dock{gap:.4rem}.dialogue-dock [data-dialogue-follow]{max-width:7rem;overflow:hidden;text-overflow:ellipsis}}\n\n.dialogue-thinker-controls,.dialogue-wb-controls{position:sticky;top:0;z-index:2;display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;padding:.75rem;border-bottom:1px solid color-mix(in srgb,currentColor 16%,transparent);background:var(--desk-paper);font-size:.62rem}\n.dialogue-thinker-controls select,.dialogue-wb-controls select{min-width:0;max-width:100%;flex:1;padding:.4rem;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:5px;background:var(--desk-paper);color:inherit;font:inherit}\n.dialogue-thinker-controls button{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:5px;background:transparent;color:inherit;padding:.4rem .5rem;font:inherit;cursor:pointer}\n.dialogue-thinker-controls button[aria-pressed=\"true\"]{background:color-mix(in srgb,#957bb0 20%,transparent);border-color:#957bb0}\n.dialogue-thinker-copy{padding:1.2rem 1.35rem 2rem}.dialogue-thinker-copy h2{margin:.5rem 0 1rem;font:600 1.5rem/1.3 Georgia,serif}.dialogue-thinker-copy h3{font:600 1.12rem/1.4 Georgia,serif;margin:.5rem 0}.dialogue-thinker-copy p{font:1rem/1.65 Georgia,serif;white-space:pre-wrap}\n.dialogue-thinker-copy small{font-size:.56rem;line-height:1.5;opacity:.62}.dialogue-thinker-statement{padding:1rem 0;border-top:1px solid color-mix(in srgb,currentColor 16%,transparent)}\n.dialogue-thinker-statement.dialogue-speaking{box-shadow:inset 3px 0 #957bb0;background:color-mix(in srgb,#957bb0 9%,transparent);padding-left:.7rem;padding-right:.7rem}\n.dialogue-thinker-evidence{display:flex;flex-wrap:wrap;gap:.4rem;margin:.75rem 0}.dialogue-thinker-evidence button{border:1px solid color-mix(in srgb,currentColor 20%,transparent);background:transparent;color:inherit;border-radius:5px;padding:.4rem .5rem;cursor:pointer;font-size:.6rem}\n.dialogue-thinker-note{font-size:.61rem!important;line-height:1.6!important;opacity:.62}.dialogue-thinker-pane .care-sections{padding:.75rem}.dialogue-thinker-pane .care-section .dialogue-thinker-statement{padding:1rem}\n.dialogue-attribution-basis{margin:.55rem 0;font-size:.6rem;line-height:1.6;opacity:.72}.dialogue-attribution-basis summary{cursor:pointer}.dialogue-attribution-basis p{font:inherit!important;margin:.45rem 0!important}\n.dialogue-wb-item{display:block;padding:1.15rem 1.3rem;border-top:1px solid color-mix(in srgb,currentColor 13%,transparent);outline:none;scroll-margin:1rem}.dialogue-wb-item:first-child{border-top:0}.dialogue-wb-item p{font:1.05rem/1.7 Georgia,serif;white-space:pre-wrap;margin:.7rem 0 0}.dialogue-wb-item:focus,.dialogue-wb-item.dialogue-evidence-active{box-shadow:inset 3px 0 var(--pane-accent);background:color-mix(in srgb,var(--pane-accent) 9%,transparent)}\n.dialogue-wb-markdown{white-space:pre-wrap;padding:1.3rem;font:1rem/1.7 Georgia,serif}\n.dialogue-trace-status{margin:.7rem 0;padding:.45rem .6rem;border-left:2px solid #ad8652;color:#bda582;font:.6rem/1.6 var(--st-font,ui-sans-serif,sans-serif)}.dialogue-trace-status summary{cursor:pointer}.dialogue-trace-status p{font:inherit!important;margin:.4rem 0}\n.dialogue-trace-status[data-trace-status=\"deeper_route\"]{border-color:var(--pane-accent);color:inherit;opacity:.64}\n.study-desk[data-skin=\"care\"] .dialogue-thinker-controls select,.study-desk[data-skin=\"care\"] .dialogue-wb-controls select{background:#161920;color:#e7e2d7}\n.study-desk[data-skin=\"care\"] .dialogue-thinker-controls,.study-desk[data-skin=\"care\"] .dialogue-wb-controls,.study-desk[data-skin=\"care\"] .dialogue-exchange-controls{background:#0e1117;color:#e7e2d7}\n\n.study-desk .library-window[data-library-scope=\"dialogue\"]{\n  --shelf-accent:#93b6dc;\n  --shelf-line:rgba(127,161,198,.18);\n  background:radial-gradient(ellipse at 7% 0,rgba(69,110,164,.11),transparent 42rem),#12171e;\n}\n.library-window[data-library-scope=\"dialogue\"] .library-toolbar{background:rgba(19,26,35,.97)}\n.study-desk .library-window[data-library-scope=\"dialogue\"] .library-grid{background:transparent}\n.library-window[data-library-scope=\"dialogue\"] .library-toolbar :focus-visible{outline-color:var(--shelf-accent)}\n.study-desk .library-window[data-library-scope=\"dialogue\"] .book-card:hover{border-color:rgba(132,167,205,.3)}\n.study-desk .library-window[data-library-scope=\"dialogue\"] .book-card:has(.book-open:focus-visible){outline-color:#93b6dc}\n.study-desk .library-window .book-dialogue .book-layers .book-kind{border-color:rgba(127,163,205,.23);color:#a9c3df}\n\n/* The source still occupies a landscape window, so faces are never cropped\n   into the narrow dimensions of a book. A failed image reveals the voice art. */\n.study-desk .library-window .book-cover.dialogue-cover{display:flex;flex-direction:column;background:var(--dialogue-cloth,#193956);color:#eaf1fd;border:1px solid #bddbff25;border-radius:2px 6px 6px 2px;--cloth:var(--dialogue-cloth,#193956)}\n.dialogue-cover-label{display:flex;align-items:center;justify-content:space-between;flex:none;height:1.3rem;padding:.3rem .6rem .3rem .65rem;color:#c5dbf5;font:650 .36rem/1 var(--st-font,system-ui,sans-serif);letter-spacing:.17em;text-transform:uppercase}\n.dialogue-cover-label svg{width:1.4rem;height:.65rem;fill:none;stroke:currentColor;stroke-width:1.15;stroke-linecap:round}\n.dialogue-cover-image{position:relative;display:block;flex:none;width:100%;aspect-ratio:16/9;overflow:hidden;background:#111d2b}\n.dialogue-voice-art{display:block;width:100%;height:100%;fill:none;stroke:#b7d4fc;stroke-width:1;opacity:.7}\n.dialogue-voice-art .voice-secondary{stroke:#6d94c4}\n.study-desk .library-window .dialogue-cover .dialogue-cover-image img{inset:0;display:block;width:100%;height:100%;object-fit:contain;background:#111d2b}\n.dialogue-cover-copy{display:flex;flex:1;min-height:0;flex-direction:column;justify-content:space-between;gap:.35rem;padding:.5rem .6rem .6rem .65rem;background:linear-gradient(135deg,#b1d4ff0b,transparent 65%)}\n.dialogue-cover-title{display:block;min-height:0;overflow:hidden;color:#f0f5fd;font:500 var(--dialogue-title-size,.83rem)/1.12 Georgia,\"Times New Roman\",serif;letter-spacing:-.02em;overflow-wrap:break-word;text-wrap:pretty}\n.dialogue-cover-author{display:-webkit-box;flex-shrink:0;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;padding-top:.45rem;border-top:1px solid #bad4f433;color:#bed0e8;font:500 .36rem/1.4 var(--st-font,system-ui,sans-serif);letter-spacing:.055em;text-transform:uppercase}\n@media(max-width:760px){\n  .dialogue-cover-copy{padding:.45rem .55rem .55rem .6rem}\n  .dialogue-cover-title{font-size:calc(var(--dialogue-title-size,.83rem) * .92)}\n  .dialogue-cover-label{padding-inline:.6rem}\n}\n\n.study-desk .original-pane{flex-basis:min(40rem,calc(100vw - 7rem));min-width:28rem;--pane-accent:#877153}\n.study-desk .original-pane[hidden]{display:none!important}\n.study-desk[data-skin=\"care\"] .original-pane{--desk-paper:#0e1117;--desk-ink:#fafafa;--pane-accent:#9d8768;color-scheme:dark}\n.study-desk[data-skin=\"library\"] .original-pane{--desk-paper:#201a15;--desk-ink:#eee3d0;color-scheme:dark}\n.study-desk[data-original-theme=\"dark\"] .original-pane{--desk-paper:#0e1117;--desk-ink:#fafafa;color-scheme:dark}\n.study-desk[data-original-theme=\"light\"] .original-pane{--desk-paper:#fbf8f1;--desk-ink:#25231f;color-scheme:light}\n.study-desk[data-original-theme] .original-pane .pane-slider{--desk-paper:inherit;--desk-ink:inherit;background:var(--desk-paper);color:var(--desk-ink)}\n.original-pane .pane-slider{border-bottom:0;padding-bottom:.1rem}\n.original-tools{display:flex;align-items:center;gap:.35rem;padding:.15rem .95rem .65rem;background:var(--desk-paper);color:var(--desk-ink);border-bottom:1px solid color-mix(in srgb,var(--pane-accent) 22%,transparent)}\n.original-tools button{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;min-height:1.8rem;padding:.3rem .55rem;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;background:transparent;color:inherit;font:600 .6rem/1.3 var(--st-font,system-ui,sans-serif);white-space:nowrap;cursor:pointer}\n.original-tools button:hover{background:color-mix(in srgb,var(--pane-accent) 13%,transparent);border-color:var(--pane-accent)}\n.original-tools button:focus-visible{outline:2px solid var(--pane-accent);outline-offset:2px}\n.original-tools button[aria-pressed=\"true\"]{background:color-mix(in srgb,var(--pane-accent) 12%,transparent);border-color:color-mix(in srgb,var(--pane-accent) 52%,transparent);color:color-mix(in srgb,var(--pane-accent) 40%,var(--desk-ink))}\n.original-tools button:disabled{opacity:.3;cursor:default}\n.original-tools svg{width:.8rem;height:.8rem;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}\n.original-tools [data-original-step]{width:1.8rem;padding:.3rem}\n.original-tools [data-original-theme-toggle]{margin-left:auto}\n.original-text-menu a{text-decoration:none;font:inherit}\n.original-download-expanded{display:none!important}\n.study-desk[data-original-expanded=\"true\"] .original-download-expanded{display:inline-flex!important}\n.study-desk[data-original-expanded=\"true\"] .original-text-menu{z-index:90}\n.original-format-control[aria-busy=\"true\"] svg{opacity:.5}\n.original-format-status{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}\n.original-status{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:.55rem/1.4 var(--st-font,system-ui,sans-serif);color:color-mix(in srgb,var(--desk-ink) 52%,transparent)}\n.study-desk .original-pane .original-pages{background:var(--desk-paper);color:var(--desk-ink);overflow-anchor:none;padding:1rem}\n.original-page{position:relative;isolation:isolate;margin:0 auto 1rem;max-width:54rem;min-height:20rem;background:var(--desk-paper);color:var(--desk-ink);overflow:hidden;scroll-margin-top:1rem}\n.original-page[data-kind=\"pdf\"]{min-height:0;aspect-ratio:var(--original-ratio,.707)}\n.original-page img.original-pdf-page{display:block;width:100%;height:100%;object-fit:contain}\n.study-desk[data-original-theme=\"dark\"] .original-pdf-page{filter:invert(1) hue-rotate(180deg);mix-blend-mode:screen}\n.study-desk[data-original-theme=\"light\"] .original-pdf-page{filter:none;mix-blend-mode:normal}\n.original-placeholder{padding:2rem;color:color-mix(in srgb,var(--desk-ink) 50%,transparent);font:italic 1rem/1.6 Georgia,serif}.original-placeholder button{display:block;margin-top:1rem;padding:.5rem .8rem;border:1px solid var(--pane-accent);border-radius:6px;background:var(--desk-paper);color:var(--desk-ink);cursor:pointer}\n.original-edition-copy{padding:clamp(1.4rem,4vw,3.5rem);font:calc(1.06rem * var(--desk-text-scale,1))/1.8 Georgia,serif;overflow-wrap:anywhere;min-height:28rem;color:inherit}\n.original-edition-copy img{display:block;max-width:100%;height:auto;margin:1rem auto}.original-edition-copy h1,.original-edition-copy h2,.original-edition-copy h3{color:inherit;font-weight:500;line-height:1.25}.original-edition-copy a{color:color-mix(in srgb,var(--pane-accent) 70%,var(--desk-ink));text-underline-offset:.2em}.original-edition-copy table{display:block;max-width:100%;overflow:auto}\n.original-awareness{box-shadow:inset 3px 0 #ad9270!important;background:color-mix(in srgb,#ad9270 13%,transparent)!important}\n.original-page-label{position:absolute;right:.6rem;top:.4rem;z-index:1;color:color-mix(in srgb,var(--desk-ink) 50%,transparent);background:var(--desk-paper);padding:.15rem .35rem;font:.55rem/1.4 system-ui,sans-serif;pointer-events:none}\n.study-desk[data-original-expanded=\"true\"] .original-pane{position:absolute;inset:3.4rem .65rem 2.8rem;z-index:45;min-width:0;width:auto;height:auto;flex-basis:auto;filter:none}\n.study-desk[data-original-expanded=\"true\"] .desk-strip[data-track-scaled]>.original-pane{zoom:1;height:auto}\n.study-desk[data-original-expanded=\"true\"] .desk-strip{overflow-x:hidden}\n.study-desk[data-original-expanded=\"true\"] .original-pane .original-pages{padding:1.6rem}\n@media(max-width:760px){.study-desk .original-pane{flex-basis:calc(100vw - 3.8rem);min-width:calc(100vw - 3.8rem)}.original-tools{padding:.45rem;gap:.25rem}.study-desk .original-pane .original-pages{padding:.5rem}.study-desk[data-original-expanded=\"true\"] .original-pane{inset:3.4rem .2rem 2.8rem;min-width:0}.original-edition-copy{padding:1.3rem}}\n\n/* The original keeps the desk's title and slider baselines, with less chrome. */\n.study-desk .original-pane {\n  --original-surround: #141716;\n  --original-paper: #191c1b;\n  --original-ink: #e8e5dc;\n  --original-muted: #a9aaa1;\n  --original-line: #ffffff12;\n  --pane-accent: #b0a083;\n  --desk-paper: var(--original-paper);\n  --desk-ink: var(--original-ink);\n  background: var(--original-surround);\n  border-color: var(--original-line);\n  color: var(--original-ink);\n  color-scheme: dark;\n}\n.study-desk[data-original-theme=\"dark\"] .original-pane,\n.study-desk[data-skin=\"care\"][data-original-theme=\"dark\"] .original-pane,\n.study-desk[data-skin=\"library\"][data-original-theme=\"dark\"] .original-pane {\n  --desk-paper: var(--original-paper);\n  --desk-ink: var(--original-ink);\n  --pane-accent: #b0a083;\n}\n.study-desk[data-original-theme=\"light\"] .original-pane {\n  --original-surround: #e8e5dd;\n  --original-paper: #faf7ef;\n  --original-ink: #373b35;\n  --original-muted: #70756a;\n  --original-line: #343b3418;\n  --desk-paper: var(--original-paper);\n  --desk-ink: var(--original-ink);\n  --pane-accent: #85765a;\n  color-scheme: light;\n}\n.study-desk .original-pane > .window-titlebar {\n  height: 2.7rem;\n  min-height: 2.7rem;\n  gap: .65rem;\n  padding: .4rem .95rem;\n  border: 0;\n  border-bottom: 1px solid var(--original-line);\n  background: var(--original-paper);\n  color: var(--original-ink);\n  cursor: default;\n}\n.original-reader-heading {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: .8rem;\n  flex: 1;\n  min-width: 0;\n  transition: opacity .16s ease;\n}\n.study-desk .original-reader-heading strong {\n  min-width: 0;\n  font: 500 .94rem/1.25 Georgia, \"Times New Roman\", serif;\n  letter-spacing: -.012em;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.original-reader-heading small {\n  flex-shrink: 0;\n  color: var(--original-muted);\n  font: 500 .5rem/1.2 var(--st-font, system-ui, sans-serif);\n  letter-spacing: .09em;\n  text-transform: uppercase;\n}\n.study-desk .original-pane .care-pane-controls { margin-right: .15rem; }\n.study-desk .original-pane .care-pane-controls button {\n  background: color-mix(in srgb, var(--pane-accent) 36%, var(--original-paper));\n  border-color: color-mix(in srgb, var(--pane-accent) 30%, transparent);\n  color: var(--original-ink);\n  box-shadow: none;\n}\n.original-reader-exit {\n  display: none;\n  align-items: center;\n  justify-content: center;\n  gap: .45rem;\n  min-height: 1.9rem;\n  padding: .3rem .65rem;\n  border: 1px solid var(--original-line);\n  border-radius: 999px;\n  background: transparent;\n  color: var(--original-ink);\n  font: 500 .62rem/1.3 var(--st-font, system-ui, sans-serif);\n  white-space: nowrap;\n  cursor: pointer;\n}\n.study-desk .original-reader-exit span {\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n}\n.original-reader-exit svg { width: .85rem; height: .85rem; fill: none; stroke: currentColor; stroke-width: 1.5; }\n.original-chrome { flex: 0 0 auto; background: var(--original-paper); }\n.study-desk .original-pane .original-chrome .pane-slider {\n  --desk-paper: var(--original-paper);\n  --desk-ink: var(--original-ink);\n  padding-top: .7rem;\n  background: transparent;\n  color: var(--original-ink);\n  opacity: .68;\n  transition: opacity .16s ease;\n}\n.original-pane .slider-track { --slider-thumb-size: 13px; --slider-ring-size: 1px; }\n.original-pane .slider-heading > span { color: var(--original-muted); font-weight: 500; }\n.original-pane .slider-heading output { color: var(--original-muted); font-weight: 500; opacity: 1; }\n.original-pane .slider-rail::before { height: 1px; opacity: .5; }\n.original-pane .slider-dot { width: 3px; height: 3px; opacity: .6; }\n.original-pane .slider-stop.active .slider-dot { opacity: 1; }\n.original-pane .sheet-slider::-webkit-slider-thumb {\n  width: 13px;\n  height: 13px;\n  margin-top: -5.5px;\n  border-width: 4px;\n  box-shadow: 0 0 0 1px var(--pane-accent);\n}\n.original-pane .sheet-slider::-moz-range-thumb {\n  width: 13px;\n  height: 13px;\n  border-width: 4px;\n  box-shadow: 0 0 0 1px var(--pane-accent);\n}\n.study-desk .original-tools {\n  gap: .25rem;\n  min-height: 2.35rem;\n  padding: .1rem .9rem .3rem;\n  border-bottom: 1px solid var(--original-line);\n  background: transparent;\n  color: var(--original-ink);\n  transition: opacity .16s ease;\n}\n.original-tools button {\n  min-height: 1.9rem;\n  padding: .35rem .55rem;\n  border: 1px solid transparent;\n  border-radius: 8px;\n  background: transparent;\n  font: 500 .61rem/1.2 var(--st-font, system-ui, sans-serif);\n  color: var(--original-muted);\n}\n.original-tools button:hover:not(:disabled), .original-reader-exit:hover {\n  background: color-mix(in srgb, var(--pane-accent) 9%, transparent);\n  border-color: color-mix(in srgb, var(--pane-accent) 22%, transparent);\n  color: var(--original-ink);\n}\n.original-tools button[aria-pressed=\"true\"] {\n  background: color-mix(in srgb, var(--pane-accent) 8%, transparent);\n  border-color: color-mix(in srgb, var(--pane-accent) 18%, transparent);\n  color: var(--original-ink);\n}\n.original-tools button:focus-visible, .original-reader-exit:focus-visible {\n  outline: 2px solid var(--pane-accent);\n  outline-offset: 3px;\n}\n.original-tools button:disabled { opacity: .3; }\n.original-tools svg { width: .85rem; height: .85rem; stroke-width: 1.4; }\n.original-tools [data-original-step] { width: 1.85rem; }\n.original-tools [data-original-theme-toggle] { margin-left: 0; }\n.original-tools [data-original-expand] { color: var(--original-ink); }\n.original-status { flex: 1; min-width: 1rem; padding-left: .25rem; color: var(--original-muted); font-size: .53rem; }\n.original-zoom {\n  display: inline-flex;\n  align-items: center;\n  flex: 0 0 auto;\n  margin-left: auto;\n  padding: 0 .2rem;\n  border-left: 1px solid var(--original-line);\n  border-right: 1px solid var(--original-line);\n}\n.original-zoom [data-original-fit] { min-width: 2.65rem; padding-inline: .3rem; font-variant-numeric: tabular-nums; }\n.original-zoom [data-original-zoom-step] { width: 1.75rem; padding-inline: .25rem; }\n.study-desk .original-pane .original-pages {\n  padding: 1.2rem 2.85rem 3rem;\n  background: var(--original-surround);\n  color: var(--original-ink);\n  overflow-x: auto;\n  scrollbar-width: thin;\n  scrollbar-color: color-mix(in srgb, var(--original-muted) 24%, transparent) transparent;\n  scrollbar-gutter: stable both-edges;\n}\n.original-page {\n  width: var(--original-page-width, min(100%, 54rem));\n  max-width: none;\n  margin: 0 auto 2rem;\n  overflow: visible;\n  background: var(--original-paper);\n  color: var(--original-ink);\n  border-radius: 2px;\n  box-shadow: 0 1px 3px #0000000d, 0 10px 38px #0000000a;\n}\n.original-page img.original-pdf-page { border-radius: inherit; }\n.original-page-label {\n  right: .65rem;\n  top: .55rem;\n  padding: .12rem .32rem;\n  background: color-mix(in srgb, var(--original-paper) 90%, transparent);\n  color: var(--original-muted);\n  border-radius: 4px;\n  font-size: .5rem;\n  opacity: .7;\n}\n.original-edition-copy {\n  padding: clamp(1.7rem, 4vw, 4.2rem);\n  font: calc(1.06rem * var(--desk-text-scale, 1) * var(--original-text-scale, 1))/1.85 Georgia, \"Times New Roman\", serif;\n  text-rendering: optimizeLegibility;\n}\n.original-edition-copy p { margin-block: 0 1.15em; }\n.original-edition-copy h1, .original-edition-copy h2, .original-edition-copy h3 { letter-spacing: -.02em; }\n.original-edition-copy ::selection { background: color-mix(in srgb, var(--pane-accent) 30%, transparent); }\n/* The small pane puts its tools in the existing titlebar. Its chapter rail\n   keeps precisely the same vertical space as the neighbouring CARE panes. */\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) { position: relative; }\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) > .window-titlebar {\n  padding-inline: .75rem 14rem;\n  gap: .45rem;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) .original-reader-heading {\n  justify-content: flex-start;\n  gap: 0;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) .original-reader-heading strong { display: none; }\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) .original-reader-heading small {\n  display: block;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: .5rem;\n  letter-spacing: .07em;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) .original-tools {\n  position: absolute;\n  top: 0;\n  right: .6rem;\n  z-index: 2;\n  height: 2.7rem;\n  min-height: 2.7rem;\n  gap: .1rem;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: transparent;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-tools button {\n  flex: 0 0 auto;\n  width: 1.5rem;\n  min-height: 1.8rem;\n  padding: .25rem;\n  border-radius: 6px;\n  font-size: .57rem;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-tools svg { width: .78rem; height: .78rem; }\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-tools [data-original-follow-label],\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-tools [data-original-theme-label],\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-tools [data-original-expand-label],\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-status { display: none; }\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-zoom {\n  gap: 0;\n  margin-inline: .15rem;\n  padding-inline: .1rem;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-zoom [data-original-zoom-step] { width: 1.3rem; }\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-zoom [data-original-fit] {\n  width: 2.05rem;\n  min-width: 2.05rem;\n  padding-inline: .1rem;\n}\n.study-desk:not([data-original-expanded=\"true\"]) .original-pane .original-chrome .pane-slider {\n  padding-bottom: .55rem;\n  border-bottom: 1px solid var(--original-line);\n}\n/* Ordinary panes keep their controls and slider alignment steady. */\n.study-desk .original-pane .original-chrome:hover .pane-slider,\n.study-desk .original-pane .original-chrome:has(:focus-visible) .pane-slider,\n.study-desk .original-pane .original-chrome:hover .original-tools,\n.study-desk .original-pane .original-chrome:has(:focus-visible) .original-tools { opacity: 1; }\n/* Expansion creates a complete reading surface inside the browser display. */\n.study-desk[data-original-expanded=\"true\"] {\n  position: fixed;\n  inset: 0;\n  z-index: 999980;\n  display: block;\n  width: 100vw;\n  height: 100dvh !important;\n  max-height: none !important;\n  min-height: 0;\n  margin: 0;\n  padding: 0;\n  overflow: hidden;\n  border: 0;\n  border-radius: 0;\n  background: #141716;\n  box-shadow: none;\n  isolation: isolate;\n}\n.study-desk[data-original-expanded=\"true\"] > .desk-toolbar,\n.study-desk[data-original-expanded=\"true\"] > .desk-status { display: none !important; }\n.study-desk[data-original-expanded=\"true\"] .desk-strip {\n  position: absolute;\n  inset: 0;\n  height: 100%;\n  min-height: 0;\n  padding: 0;\n  overflow: hidden;\n  background: transparent;\n  scrollbar-width: none;\n}\n.study-desk[data-original-expanded=\"true\"] .desk-strip > .desk-window:not(.original-pane) { visibility: hidden; }\n.study-desk[data-original-expanded=\"true\"] .original-pane,\n.study-desk[data-original-expanded=\"true\"] .desk-strip[data-track-scaled] > .original-pane {\n  position: absolute;\n  inset: 0;\n  z-index: 45;\n  width: 100%;\n  height: 100%;\n  max-width: none;\n  min-width: 0;\n  margin: 0;\n  border: 0;\n  border-radius: 0;\n  zoom: 1;\n  transform: none;\n  filter: none;\n  opacity: 1;\n  box-shadow: none;\n}\n.study-desk[data-original-expanded=\"true\"] .original-pane > .window-titlebar {\n  position: absolute;\n  inset: 0 0 auto;\n  z-index: 6;\n  min-height: 2.7rem;\n  height: 2.7rem;\n  padding: .3rem clamp(.8rem, 2vw, 1.6rem);\n  border-bottom-color: transparent;\n  background: color-mix(in srgb, var(--original-paper) 96%, transparent);\n  backdrop-filter: blur(16px);\n  transition: background .16s ease, backdrop-filter .16s ease;\n}\n.study-desk[data-original-expanded=\"true\"] .original-reader-heading { justify-content: flex-start; gap: 1rem; }\n.study-desk[data-original-expanded=\"true\"] .original-reader-heading strong { font-size: .95rem; }\n.study-desk[data-original-expanded=\"true\"] .original-reader-exit {\n  display: inline-flex;\n  order: -1;\n  min-height: 1.7rem;\n  padding: .25rem .6rem;\n  color: var(--original-muted);\n  background: color-mix(in srgb, var(--original-paper) 86%, transparent);\n  font-size: .55rem;\n}\n.study-desk[data-original-expanded=\"true\"] .original-reader-exit::before {\n  content: \"\";\n  width: .48rem;\n  height: .48rem;\n  border: 1px solid #c7896e55;\n  border-radius: 50%;\n  background: #bd8974;\n}\n.study-desk[data-original-expanded=\"true\"] .original-reader-exit svg { display: none; }\n.study-desk[data-original-expanded=\"true\"] .original-pane .care-pane-controls { display: none; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome {\n  position: absolute;\n  inset: 2.7rem 0 auto;\n  z-index: 7;\n  display: flex;\n  flex-direction: column;\n  padding: 0 clamp(.15rem, 1vw, .7rem) .1rem;\n  background: color-mix(in srgb, var(--original-paper) 96%, transparent);\n  backdrop-filter: blur(16px);\n  transition: background .16s ease, backdrop-filter .16s ease;\n}\n.study-desk[data-original-expanded=\"true\"] .original-chrome::before {\n  content: \"\";\n  position: absolute;\n  inset: 0 0 auto;\n  height: .7rem;\n  pointer-events: none;\n}\n.study-desk[data-original-expanded=\"true\"] .original-tools {\n  order: 0;\n  min-height: 1.75rem;\n  padding-block: 0;\n  border: 0;\n}\n.study-desk[data-original-expanded=\"true\"] .original-tools button {\n  min-height: 1.65rem;\n  padding-block: .2rem;\n}\n.study-desk[data-original-expanded=\"true\"] .original-tools [data-original-expand] { display: none; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .pane-slider {\n  order: 1;\n  padding: .1rem .9rem 0;\n  opacity: .85;\n}\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-heading {\n  font-size: .52rem;\n  line-height: 1.2;\n}\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-heading output { font-size: .48rem; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-track,\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-rail { height: 1.25rem; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-track { margin-top: 0; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-rail::before { top: .6rem; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .sheet-slider { top: 0; height: 1.2rem; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-stops { top: 0; height: 1.25rem; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-stop { min-height: 1.25rem; padding-top: .48rem; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome .slider-stop-label { display: none; }\n.study-desk[data-original-expanded=\"true\"] .original-pane .original-pages {\n  position: absolute;\n  inset: 0;\n  z-index: 0;\n  height: 100% !important;\n  padding: 7rem 3rem 0;\n  scroll-padding-top: 7rem;\n}\n.study-desk[data-original-expanded=\"true\"] .original-page { width: var(--original-page-width, min(100%, 48rem)); margin-bottom: 2.5rem; }\n.study-desk[data-original-expanded=\"true\"] .original-page:last-child { margin-bottom: 0; }\n.study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-chrome {\n  background: transparent;\n  backdrop-filter: none;\n  pointer-events: none;\n}\n.study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-chrome::before { pointer-events: auto; }\n.study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-chrome > * {\n  opacity: 0;\n  pointer-events: none;\n}\n.study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-pane > .window-titlebar {\n  background: transparent;\n  backdrop-filter: none;\n}\n.study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-reader-heading { opacity: .46; }\n.study-desk[data-original-expanded=\"true\"] .original-chrome:has(:focus-visible),\n.study-desk[data-original-expanded=\"true\"] .original-chrome:hover {\n  background: color-mix(in srgb, var(--original-paper) 96%, transparent);\n  backdrop-filter: blur(16px);\n  pointer-events: auto;\n}\n.study-desk[data-original-expanded=\"true\"] .original-chrome:has(:focus-visible) > *,\n.study-desk[data-original-expanded=\"true\"] .original-chrome:hover > * { opacity: 1; pointer-events: auto; }\n.study-desk[data-original-expanded=\"true\"] .original-pane > .window-titlebar:hover .original-reader-heading,\n.study-desk[data-original-expanded=\"true\"] .original-pane > .window-titlebar:has(:focus-visible) .original-reader-heading { opacity: 1; }\n/* On a full reading surface, the buttons share the title row. */\n@media (min-width: 761px) {\n  .study-desk[data-original-expanded=\"true\"] .original-reader-heading { max-width: calc(100% - 30rem); }\n  .study-desk[data-original-expanded=\"true\"] .original-tools {\n    position: absolute;\n    right: 1.2rem;\n    bottom: 100%;\n    height: 2.7rem;\n    padding: .2rem 0;\n    gap: .35rem;\n  }\n  .study-desk[data-original-expanded=\"true\"] .original-tools [data-original-expand],\n  .study-desk[data-original-expanded=\"true\"] .original-status { display: none; }\n  .study-desk[data-original-expanded=\"true\"] .original-pane .original-pages { padding-top: 5.2rem; scroll-padding-top: 5.2rem; }\n}\n.study-desk .original-pane.care-pane-minimized .original-reader-heading {\n  flex: 0 1 auto;\n  flex-direction: column;\n  align-items: center;\n  max-height: calc(100% - 4rem);\n  overflow: hidden;\n}\n.study-desk .original-pane.care-pane-minimized .original-reader-heading strong { writing-mode: vertical-rl; }\n.study-desk .original-pane.care-pane-minimized .original-reader-heading small { display: none; }\n@media (max-width: 760px) {\n  .original-reader-heading small { display: none; }\n  .study-desk .original-tools { gap: .12rem; padding-inline: .45rem; }\n  .original-tools button { padding-inline: .4rem; }\n  .original-tools [data-original-theme-label], .original-tools [data-original-expand-label] { display: none; }\n  .original-status { display: none; }\n  .study-desk .original-pane .original-pages { padding: .8rem 2.85rem 2.5rem .6rem; }\n  .study-desk[data-original-expanded=\"true\"] .original-pane { inset: 0; min-width: 0; }\n  .study-desk[data-original-expanded=\"true\"] .original-pane > .window-titlebar { padding-inline: .8rem; }\n  .study-desk[data-original-expanded=\"true\"] .original-reader-heading strong { font-size: .95rem; }\n  .study-desk[data-original-expanded=\"true\"] .original-chrome { padding-inline: .15rem; }\n  .study-desk[data-original-expanded=\"true\"] .original-pane .original-pages { padding: 7rem 2.85rem 0 .7rem; }\n  .original-edition-copy { padding: 1.7rem 1.3rem; }\n}\n@media (max-width: 480px) {\n  .original-tools [data-original-follow-label] { display: none; }\n  .study-desk[data-original-expanded=\"true\"] .original-reader-exit span { display: none; }\n  .study-desk[data-original-expanded=\"true\"] .original-reader-exit { width: 1.7rem; padding: 0; }\n}\n@media (max-width: 600px) {\n  .study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) .original-reader-heading { display: none; }\n  .study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) > .window-titlebar { padding-left: .6rem; }\n  .study-desk:not([data-original-expanded=\"true\"]) .original-pane:not(.care-pane-minimized) .original-tools { right: .45rem; }\n}\n@media (hover: none) {\n  .study-desk[data-original-expanded=\"true\"] .original-tools { min-height: 2.2rem; }\n  .study-desk[data-original-expanded=\"true\"] .original-tools button { min-height: 2.1rem; }\n  .study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-chrome {\n    background: color-mix(in srgb, var(--original-paper) 96%, transparent);\n    backdrop-filter: blur(16px);\n    pointer-events: auto;\n  }\n  .study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-chrome > * { opacity: 1; pointer-events: auto; }\n  .study-desk[data-original-expanded=\"true\"] .original-chrome::before { pointer-events: none; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .original-reader-heading, .original-chrome, .original-chrome .pane-slider, .original-tools,\n  .study-desk .original-pane > .window-titlebar { transition: none; }\n}\n\n/* Persistent escape hatch: independent of the auto-hiding reader chrome. */\n.original-reading-dock{display:none}\n.study-desk .original-chrome[hidden],.study-desk .original-pane>.window-titlebar[hidden]{display:none!important}\n.study-desk[data-original-expanded=\"true\"] .original-reading-dock{position:absolute;z-index:25;left:max(.85rem,env(safe-area-inset-left));bottom:max(.85rem,env(safe-area-inset-bottom));display:flex;align-items:center;gap:.1rem;padding:.2rem;border:1px solid var(--original-line);border-radius:999px;background:color-mix(in srgb,var(--original-paper) 94%,transparent);color:var(--original-ink);box-shadow:0 3px 16px #00000014;backdrop-filter:blur(12px)}\n.original-reading-dock button{display:inline-flex;align-items:center;gap:.4rem;min-height:2rem;padding:.4rem .65rem;border:0;border-radius:999px;background:transparent;color:inherit;font:500 .62rem/1 var(--st-font,system-ui,sans-serif);cursor:pointer}\n.original-reading-dock button:hover{background:color-mix(in srgb,var(--pane-accent) 12%,transparent)}\n.original-reading-dock button:focus-visible{outline:2px solid var(--pane-accent);outline-offset:1px}\n.original-reading-dock svg{width:.9rem;height:.9rem;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}\n.study-desk[data-original-expanded=\"true\"][data-original-quiet=\"true\"] .original-pane>.window-titlebar{opacity:0;pointer-events:none}\n.study-desk[data-original-expanded=\"true\"][data-original-controls-mode=\"hidden\"] .original-chrome{background:transparent!important;backdrop-filter:none!important;pointer-events:none!important}\n.study-desk[data-original-expanded=\"true\"][data-original-controls-mode=\"hidden\"] .original-chrome>*{opacity:0!important;pointer-events:none!important}\n.study-desk[data-original-expanded=\"true\"][data-original-controls-mode=\"hidden\"] .original-chrome::before{pointer-events:none}\n.study-desk[data-original-expanded=\"true\"][data-original-controls-mode=\"shown\"] .original-chrome{background:color-mix(in srgb,var(--original-paper) 96%,transparent);backdrop-filter:blur(16px)}\n.study-desk[data-original-expanded=\"true\"][data-original-controls-mode=\"shown\"] .original-chrome>*{opacity:1;pointer-events:auto}\n@media(max-width:760px){.original-reading-dock button{min-height:2.4rem}}\n\n.study-desk .original-page[data-original-annotated=\"true\"]{overflow:visible}\n.original-annotation-anchor{position:relative}\n.original-annotation-rail{position:absolute;inset-inline-end:-2.55rem;top:.1rem;width:2.5rem;display:flex;flex-wrap:wrap;align-content:flex-start;gap:0;z-index:3;line-height:1;isolation:isolate}\n.original-page>.original-annotation-rail{top:2.4rem}\n.original-annotation-dot{position:relative;display:grid;place-items:center;width:1.25rem;min-width:1.25rem;height:1.5rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--original-note-accent);cursor:pointer;opacity:.58;transition:opacity .18s ease,background .18s ease;touch-action:manipulation}\n.original-annotation-dot::before{content:\"\";display:block;width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 0 1px color-mix(in srgb,currentColor 25%,transparent);transition:transform .18s ease,box-shadow .18s ease}\n.original-annotation-dot:hover,.original-annotation-dot:focus-visible,.original-annotation-dot[aria-pressed=\"true\"]{opacity:1}\n.original-annotation-dot:hover::before,.original-annotation-dot:focus-visible::before,.original-annotation-dot[aria-pressed=\"true\"]::before{transform:scale(1.2);box-shadow:0 0 0 3px color-mix(in srgb,currentColor 17%,transparent)}\n.original-annotation-dot:focus-visible{outline:1px solid currentColor;outline-offset:1px}\n.original-annotation-dot::after{content:attr(data-original-note);position:absolute;inset-inline-end:calc(100% + .45rem);top:50%;transform:translateY(-50%);width:max-content;max-width:min(16rem,60vw);padding:.6rem .75rem;border:1px solid color-mix(in srgb,var(--original-note-accent) 28%,transparent);border-radius:.65rem;background:var(--desk-paper);color:var(--desk-ink);box-shadow:0 .3rem 1.3rem #0002;white-space:normal;text-align:start;font:400 .7rem/1.5 var(--st-font,system-ui,sans-serif);opacity:0;visibility:hidden;pointer-events:none}\n.original-annotation-dot:hover::after,.original-annotation-dot:focus-visible::after{opacity:1;visibility:visible}\n\n.original-annotation-cluster{position:relative;display:block}\n.original-annotation-menu{position:absolute;right:calc(100% + .5rem);top:0;z-index:8;display:grid;gap:.2rem;width:min(22rem,65vw);max-height:18rem;overflow:auto;padding:.4rem;border:1px solid var(--original-line);border-radius:12px;background:var(--original-paper);box-shadow:0 10px 35px #0005;scrollbar-width:thin}\n.original-annotation-menu[hidden]{display:none}\n.original-annotation-item{display:block;width:100%;padding:.65rem .7rem .65rem 1.15rem;position:relative;border:0;border-radius:7px;background:transparent;color:var(--original-ink);font:400 .8rem/1.5 Georgia,serif;text-align:left;cursor:pointer}\n.original-annotation-item::before{content:\"\";position:absolute;left:.35rem;top:1rem;width:4px;height:4px;border-radius:50%;background:var(--original-note-accent)}\n.original-annotation-item:hover,.original-annotation-item:focus-visible,.original-annotation-item[aria-pressed=\"true\"]{background:color-mix(in srgb,var(--original-note-accent) 14%,transparent);outline:1px solid color-mix(in srgb,var(--original-note-accent) 35%,transparent)}\n\n@media(prefers-reduced-motion:reduce){.original-annotation-dot,.original-annotation-dot::before{transition:none}}\n@media(pointer:coarse){.original-annotation-rail{width:2.75rem;inset-inline-end:-2.8rem}.original-annotation-dot{width:1.375rem;min-width:1.375rem;height:1.75rem}}\n\n.study-desk .beautiful-text-toggle{display:inline-flex;align-items:center;justify-content:space-between;gap:.55rem;min-height:1.85rem;padding:.35rem .55rem;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:999px;background:transparent;color:inherit;font:550 .65rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:0;white-space:nowrap;cursor:pointer}\n.study-desk .beautiful-text-toggle:hover{background:color-mix(in srgb,currentColor 9%,transparent)}\n.study-desk .beautiful-text-toggle:focus-visible{outline:2px solid currentColor;outline-offset:3px}\n.study-desk .beautiful-text-toggle .beautiful-text-label{margin:0;padding:0;border:0;background:transparent;font:inherit;letter-spacing:0;white-space:nowrap}\n.study-desk .beautiful-text-toggle .beautiful-text-switch{position:relative;display:block;flex:0 0 1.65rem;width:1.65rem;height:.95rem;margin:0;padding:0;border:1px solid currentColor;border-radius:999px;background:transparent;opacity:.75}\n.study-desk .beautiful-text-switch::after{content:\"\";position:absolute;top:.14rem;left:.14rem;width:.53rem;height:.53rem;border-radius:50%;background:currentColor;transition:transform .16s ease}\n.study-desk .beautiful-text-toggle[aria-pressed=\"true\"] .beautiful-text-switch{background:color-mix(in srgb,currentColor 17%,transparent);opacity:1}\n.study-desk .beautiful-text-toggle[aria-pressed=\"true\"] .beautiful-text-switch::after{transform:translateX(.69rem)}\n.study-desk .desk-menu-panel .beautiful-text-toggle{width:100%;margin:.15rem 0 .4rem;padding:.5rem .55rem;border-radius:6px;border-color:transparent;font-size:.72rem}\n.study-desk[data-beautiful-text=\"true\"]{--beautiful-font:\"Iowan Old Style\",\"Palatino Linotype\",Palatino,Georgia,\"Times New Roman\",serif;--beautiful-ink:#302d28;--beautiful-muted:#756b5e;--beautiful-address:#8a603f;--beautiful-rule:#34291916}\n.study-desk[data-beautiful-text=\"true\"][data-skin=\"care\"]{--beautiful-ink:#ede9e0;--beautiful-muted:#b3a99a;--beautiful-address:#b88456;--beautiful-rule:#ece5d514}\n.study-desk[data-beautiful-text=\"true\"] .source-copy{padding:1.4rem var(--reader-source-inset,1.35rem) 3.5rem;padding-right:calc(var(--reader-source-inset,1.35rem) + .4rem)}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .source-head{max-width:60ch;margin:0 0 .95rem;padding:0 0 .85rem;border-bottom-color:var(--beautiful-rule)}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .source-head h2{margin:.3rem 0 .35rem;font-family:var(--beautiful-font);font-size:clamp(1.35rem,2.25vw,1.9rem);font-weight:500;line-height:1.2;letter-spacing:-.018em;text-wrap:balance;color:var(--beautiful-ink)}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .source-head p{font-family:var(--beautiful-font);font-size:.8rem;line-height:1.5;color:var(--beautiful-muted)}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .source-head .source-heading-context{margin:0 0 .35rem;font:550 .62rem/1.5 var(--st-font,system-ui,sans-serif);letter-spacing:.035em;color:var(--beautiful-muted)}\n.study-desk[data-beautiful-text=\"true\"] .source-copy>.passage-row,.study-desk[data-beautiful-text=\"true\"] .source-copy>.passage{max-width:64ch;margin-inline:0 auto}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage{padding:.65rem 0 .85rem;border-top-color:var(--beautiful-rule);color:var(--beautiful-ink);scroll-margin-block:1.25rem}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text,.study-desk[data-beautiful-text=\"true\"] .route-source-card .passage-text,.study-desk[data-beautiful-text=\"true\"] .inspect-text.source{max-width:60ch;font-family:var(--beautiful-font);font-size:calc(1.04rem * var(--desk-text-scale,var(--reader-text-scale,1)));font-weight:400;line-height:1.78;letter-spacing:0;text-align:start;text-wrap:pretty;font-kerning:normal;font-variant-ligatures:common-ligatures;color:var(--beautiful-ink);overflow-wrap:break-word;word-break:normal;hyphens:manual}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text{max-width:none;font-size:calc(1.08rem * var(--desk-text-scale,var(--reader-text-scale,1)));line-height:1.7}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .care-reading-text,.study-desk[data-beautiful-text=\"true\"] .route-source-card .care-reading-text,.study-desk[data-beautiful-text=\"true\"] .inspect-text.source .care-reading-text{max-width:none;margin:0;font-family:inherit;line-height:inherit;color:inherit;overflow-wrap:break-word}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text p{margin:0 0 1em;line-height:inherit}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text p:last-child{margin-bottom:0}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text :is(h1,h2,h3,h4,h5,h6){margin:.65em 0 .4em;font-family:var(--beautiful-font);font-weight:600;line-height:1.35;letter-spacing:-.012em;text-wrap:balance}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text blockquote{margin:.35em 0;padding:.05em 0 .05em .9em;border-left:2px solid color-mix(in srgb,var(--beautiful-muted) 35%,transparent);color:inherit}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-address{margin-bottom:.4rem;color:var(--beautiful-address);font-size:.54rem;font-weight:500;line-height:1.5;letter-spacing:.045em;overflow-wrap:anywhere}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text a{color:inherit;text-decoration-color:color-mix(in srgb,currentColor 45%,transparent);text-decoration-thickness:1px;text-underline-offset:.16em}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text a:hover{text-decoration-color:currentColor}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text :is(pre,code,.care-reading-math,math,svg){text-wrap:wrap;letter-spacing:normal;font-variant-ligatures:none}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage:focus-visible{outline:2px solid var(--pane-accent);outline-offset:2px}\n.study-desk[data-beautiful-text=\"true\"] .source-copy[data-beautiful-opening]>.source-head{margin-bottom:.55rem;padding-bottom:.7rem}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage[data-beautiful-opening]{padding-block:.38rem .48rem;border-top-color:transparent}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage[data-beautiful-opening] .passage-address{margin-bottom:.2rem;line-height:1.35}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage[data-beautiful-opening] .passage-text{font-size:calc(1.02rem * var(--desk-text-scale,var(--reader-text-scale,1)));line-height:1.45;text-wrap:balance}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage[data-beautiful-opening] .passage-text :is(p,h1,h2,h3,h4,h5,h6){margin:0;font-size:inherit;font-weight:500;line-height:inherit}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage[data-beautiful-opening=\"number\"]{display:flex;align-items:baseline;gap:.7rem;padding-block:.35rem .6rem}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage[data-beautiful-opening=\"number\"] .passage-address{margin:0}\n.study-desk[data-beautiful-text=\"true\"] .source-copy .beautiful-detail-row:has(>.passage[data-beautiful-folded=\"true\"]){display:none}\n.study-desk[data-beautiful-text=\"true\"] .passage[data-beautiful-folded=\"true\"]>.passage-text{display:none}\n@media(max-width:760px){.study-desk[data-beautiful-text=\"true\"] .source-copy{padding:1rem 1.4rem 2.8rem 1rem}.study-desk[data-beautiful-text=\"true\"] .source-copy .passage{padding-inline:0}.study-desk[data-beautiful-text=\"true\"] .source-copy .passage-text{font-size:calc(1.06rem * var(--desk-text-scale,var(--reader-text-scale,1)))}}\n@media(prefers-reduced-motion:reduce){.study-desk .beautiful-text-switch::after{transition:none}}\n\n.study-desk .title-view-toggle{display:flex;align-items:center;justify-content:space-between;gap:.55rem;width:100%;margin:.15rem 0 .4rem;padding:.5rem .55rem;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;font:550 .72rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:0;cursor:pointer}\n.study-desk .title-view-toggle:hover{background:color-mix(in srgb,currentColor 9%,transparent)}\n.study-desk .title-view-toggle:focus-visible{outline:2px solid currentColor;outline-offset:3px}\n.study-desk .title-view-switch{position:relative;display:block;flex:0 0 1.65rem;width:1.65rem;height:.95rem;border:1px solid currentColor;border-radius:999px;opacity:.75}\n.study-desk .title-view-switch::after{content:\"\";position:absolute;top:.14rem;left:.14rem;width:.53rem;height:.53rem;border-radius:50%;background:currentColor;transition:transform .16s ease}\n.study-desk .title-view-toggle[aria-pressed=\"true\"] .title-view-switch{background:color-mix(in srgb,currentColor 17%,transparent);opacity:1}\n.study-desk .title-view-toggle[aria-pressed=\"true\"] .title-view-switch::after{transform:translateX(.69rem)}\n.study-desk .reader-simple-title{display:none}\n.study-desk[data-title-view=\"true\"] .reader-full-title{display:none}\n.study-desk[data-title-view=\"true\"] .reader-simple-title{display:inline}\n.study-desk[data-skin] .window-titlebar strong :is(.reader-simple-title,.reader-full-title),\n.study-desk[data-skin] .reader-title-controls .pane-language>span{margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;letter-spacing:inherit}\n.study-desk[data-title-view=\"true\"] :is(.source-head,.care-head):has(.reader-simple-title) .pane-kicker,\n.study-desk[data-title-view=\"true\"] :is(.source-head,.care-head):has(.reader-simple-title)>p{display:none}\n/* Keep slider edges stable; compact headings carry a copyable reading imprint. */\n.study-desk{--reader-source-inset:1.35rem;--reader-source-right:calc(var(--reader-source-inset) + .4rem);--reader-section-inset:.85rem;--reader-care-title-inset:1.15rem}\n.study-desk[data-skin=\"care\"]{--reader-section-inset:.75rem}\n.study-desk[data-skin=\"library\"]{--reader-section-inset:1rem}\n.study-desk[data-skin=\"classic\"]{--reader-section-inset:.7rem}\n.study-desk[data-title-view=\"true\"] .source-copy{padding:0 var(--reader-source-right) 3.5rem var(--reader-source-inset)}\n.study-desk[data-title-view=\"true\"] .source-copy .source-head,\n.study-desk[data-title-view=\"true\"] .source-copy[data-beautiful-opening]>.source-head{max-width:none;margin:0 calc(-1 * var(--reader-source-right)) .75rem calc(-1 * var(--reader-source-inset));padding:.95rem var(--reader-source-right) .85rem var(--reader-source-inset);border-bottom:1px solid color-mix(in srgb,var(--desk-ink) 13%,transparent);text-align:start}\n.study-desk[data-title-view=\"true\"] .source-copy>.passage-row:nth-child(1 of .passage-row:not(.beautiful-detail-row))>.passage{border-top-color:transparent}\n.study-desk[data-title-view=\"true\"] .care-head{padding:.95rem var(--reader-care-title-inset) .85rem}\n.study-desk[data-title-view=\"true\"] .care-pane>.pane-slider{padding-inline:var(--reader-care-title-inset)}\n.study-desk[data-title-view=\"true\"] .care-pane .slider-heading{padding-inline:0}\n.study-desk[data-title-view=\"true\"][data-view=\"outline\"] .outline-content .care-head{padding-inline:1.05rem}\n.study-desk[data-title-view=\"true\"] .source-copy .source-head h2,\n.study-desk[data-title-view=\"true\"] .care-head .care-heading h2{margin:0;font-family:Georgia,\"Times New Roman\",serif;font-size:calc(1.48rem * var(--desk-text-scale,var(--reader-text-scale,1)));font-weight:600;line-height:1.22;letter-spacing:-.018em;text-align:start;text-wrap:pretty;overflow-wrap:break-word;word-break:normal}\n.study-desk[data-title-view=\"true\"] .care-head .care-heading{align-items:center;gap:.65rem}\n.study-desk[data-title-view=\"true\"][data-skin] :is(.source-head,.care-head)::after{display:none}\n.study-desk .reader-pane-imprint{display:none}\n.study-desk[data-title-view=\"true\"] .reader-pane-imprint{position:relative;display:flex;align-items:center;gap:.45rem;margin-top:.45rem;min-width:0;color:inherit}\n.study-desk .reader-pane-code{display:inline-flex;align-items:center;min-width:0;max-width:100%;min-height:1.15rem;padding:0;border:0;border-radius:2px;background:transparent;color:color-mix(in srgb,var(--pane-accent,var(--color,currentColor)) 70%,var(--desk-ink,currentColor));font:650 .54rem/1.25 var(--st-code-font,ui-monospace,monospace);letter-spacing:.075em;text-align:start;cursor:text;-webkit-user-select:text;user-select:text}\n.study-desk .reader-pane-code{overflow-wrap:anywhere;white-space:normal}\n.study-desk .reader-title-controls{display:inline-flex;align-items:center;justify-content:flex-end;gap:.35rem;flex:0 0 auto;min-width:0;margin-left:auto;margin-right:.45rem}\n.study-desk .slider-heading:has(.reader-title-controls) output{margin-left:0}\n.study-desk .reader-title-controls .pane-language{float:none;display:inline-flex;align-items:center;gap:.25rem;flex:0 0 auto;min-height:1.5rem;margin:0;padding:.15rem .3rem;border:0;border-radius:4px;background:transparent;color:inherit;font:550 .6rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:.035em;white-space:nowrap;opacity:.72;cursor:pointer}\n.study-desk .reader-title-controls .pane-language:hover,.study-desk .reader-title-controls .pane-language:focus-visible{opacity:1;background:color-mix(in srgb,var(--pane-accent) 15%,transparent)}\n.study-desk[data-skin=\"care\"] .reader-title-controls .pane-language{color:#fff;opacity:.62}\n.study-desk .window-titlebar>.reader-title-controls{margin-left:auto;color:inherit;text-transform:none}\n.study-desk .care-pane-minimized>.window-titlebar>.reader-title-controls{display:none}\n.study-desk .reader-title-controls [data-edit-source]{order:-1;margin-right:.35rem}\n@media(max-width:760px){.study-desk{--reader-source-inset:1rem;--reader-care-title-inset:var(--reader-section-inset)}}\n@media(prefers-reduced-motion:reduce){.study-desk .title-view-switch::after{transition:none}}\n\n.study-desk :is([data-reader-code],.axiom-text,.passage-text,.passage-address,.route-card-text,.route-card-id),\n.field-desk :is([data-reader-code],.item-text,.item-address,.axiom-text,.passage-text,.passage-address,.route-card-text,.route-card-id){cursor:text;-webkit-user-select:text;user-select:text}\n\n/* Borrow the source margin for the selection rail, preserving the reading\n   measure and heading alignment. Keep this after Beautiful text's mobile reset\n   and apply it before selection so neither prose nor passage labels jump. */\n.study-desk[data-beautiful-text=\"true\"] .source-copy .passage{width:calc(100% + 1.7rem);max-width:none;margin-inline:-.85rem;padding-inline:.85rem}\n/* A quiet menu bar; the reading surface keeps all of its existing controls. */\n.study-desk:has(>.desk-menu-toolbar){grid-template-rows:auto minmax(0,1fr)}\n.study-desk:has(>.desk-menu-toolbar)>.desk-status{display:none}\n.study-desk .desk-menu-panel .desk-track-zoom{display:flex;gap:.2rem;margin:.2rem .25rem .4rem;padding:.2rem;border:1px solid color-mix(in srgb,currentColor 13%,transparent);border-radius:6px}\n.study-desk .desk-menu-panel .desk-track-zoom .desk-tab{width:auto;flex:1;justify-content:center;min-width:0;padding:.4rem .3rem;white-space:nowrap;font-size:.65rem}\n.study-desk .desk-menu-panel .desk-track-zoom [data-track-zoom=\"fit\"]{flex:2}\n.desk-shortcut-list{padding:.35rem .55rem .5rem}\n.desk-shortcut-list>div{display:grid;gap:.16rem;padding:.4rem 0;border-top:1px solid color-mix(in srgb,currentColor 10%,transparent);font-size:.67rem;line-height:1.4}\n.desk-shortcut-list kbd{font:600 .63rem/1.4 var(--st-font,system-ui,sans-serif)}\n.desk-shortcut-list span{opacity:.6}\n\n.study-desk:has(>.desk-menu-toolbar){grid-template-columns:minmax(0,1fr)}\n.study-desk .desk-toolbar.desk-menu-toolbar{min-width:0;width:100%;position:relative;z-index:30;display:flex;flex-wrap:nowrap;min-height:2.75rem;height:auto;gap:.75rem;overflow:visible;padding:.3rem .78rem}\n.study-desk .desk-menu-toolbar>.desk-reader-controls{flex:0 0 auto;justify-content:flex-start;gap:.12rem;margin:0;padding:0;overflow:visible;max-width:none}\n.study-desk .desk-menu-toolbar>.desk-title{flex:1 1 12rem;min-width:0;max-width:none;margin-left:auto;text-align:right}\n.study-desk .desk-menu-toolbar>.desk-title strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15}\n.study-desk .desk-menu-toolbar>.desk-title span{display:block;margin-top:.12rem;font-size:.56rem;line-height:1.15}\n.desk-menu{display:contents}\n.study-desk .desk-menu-trigger{display:flex;align-items:center;gap:.38rem;min-height:1.85rem;padding:.3rem .55rem;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;font:600 .74rem/1.2 var(--st-font,system-ui,sans-serif);cursor:pointer;white-space:nowrap}\n.desk-menu-trigger svg{width:.6rem;height:.6rem;fill:none;stroke:currentColor;stroke-width:1.5;opacity:.4}\n.study-desk .desk-menu-trigger:hover,.study-desk .desk-menu-trigger[aria-expanded=\"true\"]{background:color-mix(in srgb,currentColor 7%,transparent);border-color:color-mix(in srgb,currentColor 12%,transparent)}\n.study-desk .desk-menu-trigger:focus-visible,.study-desk .desk-menu-panel button:focus-visible{outline:2px solid #8ca9bd;outline-offset:1px}\n.study-desk .desk-menu-panel{position:absolute;z-index:35;top:calc(100% - .25rem);left:.8rem;width:15rem;max-width:calc(100% - 1rem);padding:.35rem;border:1px solid var(--desk-line);border-radius:9px;background:var(--desk-paper);color:var(--desk-ink);box-shadow:0 12px 36px #0005;overflow:auto;overscroll-behavior:contain;font-family:var(--st-font,system-ui,sans-serif)}\n.study-desk .desk-menu-panel[hidden]{display:none}\n.study-desk[data-skin=\"care\"] .desk-menu-panel{background:#171b21;color:#e9e6df;border-color:#343942}\n.study-desk[data-skin=\"library\"] .desk-menu-panel{background:#251e18;color:#eee3d0;border-color:#745338}\n.study-desk[data-skin=\"classic\"] .desk-menu-panel{background:#d6d6d6;color:#101010;border-radius:0;box-shadow:3px 3px #111}\n.desk-menu-heading{display:block;padding:.45rem .55rem .3rem;opacity:.5;font-size:.56rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase}\n.desk-menu-rule{height:1px;margin:.4rem .3rem;background:currentColor;opacity:.12}\n.study-desk .desk-menu-panel .desk-tabs,.study-desk .desk-menu-panel .connection-controls,.study-desk .desk-menu-panel .connection-tab-rail{display:flex;flex-direction:column;align-items:stretch;gap:.12rem;width:100%;max-width:none;min-width:0;margin:0;overflow:visible;flex:none}\n.study-desk .desk-menu-panel .connection-tab-scroll{display:none}\n.study-desk .desk-menu-panel .desk-tab,.study-desk .desk-menu-panel .desk-action{display:flex;align-items:center;justify-content:flex-start;gap:.6rem;width:100%;max-width:none;min-height:2rem;height:auto;margin:0;padding:.4rem .55rem;border:0;border-radius:5px;box-shadow:none;background:transparent;color:inherit;text-align:left;font:550 .72rem/1.3 var(--st-font,system-ui,sans-serif);letter-spacing:0;white-space:normal}\n.study-desk .desk-menu-panel .desk-tab:hover,.study-desk .desk-menu-panel .desk-action:hover{background:color-mix(in srgb,currentColor 8%,transparent)}\n.study-desk[data-skin] .desk-menu-panel .desk-tab.active{color:inherit;background:color-mix(in srgb,currentColor 9%,transparent)}\n.study-desk .desk-menu-panel [data-pane-target]::after{content:\"\";margin-left:auto}\n.study-desk .desk-menu-panel [data-pane-target].active::after{content:\"\u2713\";opacity:.7}\n.desk-menu-panel .desk-tab>svg{flex:0 0 1rem;width:1rem;height:1rem}\n.desk-menu-panel .desk-build-version>svg{order:2;margin-left:auto;max-width:.65rem}\n.desk-menu-panel .desk-bookmark-control>small{order:2;margin-left:auto}\n.desk-menu-panel .desk-sheet-version-slot{display:block}.desk-menu-panel .desk-sheet-version-slot:empty{display:none}\n.desk-menu-panel .desk-view,.desk-menu-panel .desk-skin,.desk-menu-panel .desk-text-size{display:flex;gap:.25rem;margin:.2rem .25rem .4rem;padding:.2rem;border:1px solid color-mix(in srgb,currentColor 13%,transparent);border-radius:6px;flex-wrap:wrap}\n.study-desk .desk-menu-panel .desk-view button,.study-desk .desk-menu-panel .desk-skin button,.study-desk .desk-menu-panel .desk-text-size button{flex:1;min-height:2rem;padding:.4rem .6rem;font-size:.65rem}\n.desk-menu-panel .desk-skin>span{display:none}\n.study-desk .desk-layer-menu{z-index:36;width:13rem}\n.desk-menu-panel .desk-submenu-arrow{margin-left:auto;opacity:.55;font-size:.9rem}\n.desk-menu-panel [data-reader-layers][aria-expanded=\"true\"]{background:color-mix(in srgb,currentColor 8%,transparent)}\n.desk-menu-empty{display:block;padding:.6rem;font-size:.7rem;opacity:.6}\n@media(max-width:760px){.study-desk .desk-toolbar.desk-menu-toolbar{gap:.2rem;flex-wrap:wrap;padding:.35rem .5rem}.study-desk .desk-menu-toolbar>.desk-title{order:-1;flex-basis:100%;text-align:right;padding:.05rem .35rem .15rem}.study-desk .desk-menu-toolbar>.desk-title strong{font-size:.9rem}.study-desk .desk-menu-toolbar>.desk-title span{display:none}.study-desk .desk-menu-toolbar>.desk-reader-controls{flex:1;justify-content:space-between}.study-desk .desk-menu-trigger{font-size:.65rem;padding:.4rem .35rem;gap:.25rem}}\n\n/* Remove surplus chrome, retaining the full menus and a distinct book title. */\n.study-desk .desk-toolbar.desk-menu-toolbar{min-height:2.5rem;gap:.5rem;padding:.1rem .65rem}\n.study-desk .desk-menu-trigger{min-height:36px}\n@media(max-width:760px){\n  .study-desk .desk-toolbar.desk-menu-toolbar{gap:.1rem .4rem;flex-wrap:nowrap;padding:.1rem .45rem}\n  .study-desk .desk-menu-toolbar>.desk-reader-controls{flex:0 1 auto;max-width:100%;justify-content:flex-start;flex-wrap:wrap;gap:.15rem;margin:0;padding:0}\n  .study-desk .desk-menu-toolbar>.desk-title{order:0;flex:1 1 10rem;padding:0 .2rem}\n  .study-desk .desk-menu-trigger{flex:0 0 auto;min-width:36px;padding:.35rem .5rem;gap:.3rem;border-radius:6px;font-size:.72rem;line-height:1.2}\n  .study-desk .desk-menu-trigger svg{opacity:.6}\n  .study-desk .desk-menu-trigger:hover,.study-desk .desk-menu-trigger[aria-expanded=\"true\"]{background:color-mix(in srgb,currentColor 9%,transparent)}\n  .study-desk .desk-menu-panel .desk-tab,.study-desk .desk-menu-panel .desk-action{min-height:36px}\n}\n@media(max-width:560px){\n  .study-desk .desk-toolbar.desk-menu-toolbar{flex-wrap:wrap;padding:.2rem .45rem .1rem}\n  .study-desk .desk-menu-toolbar>.desk-title{order:-1;flex-basis:100%;padding:.05rem .25rem 0}\n  .study-desk .desk-menu-toolbar>.desk-title strong{font-size:.84rem;line-height:1.15}\n}\n@media(pointer:coarse){\n  .study-desk .desk-menu-trigger{min-width:44px;min-height:44px}\n  .study-desk .desk-menu-panel .desk-tab,.study-desk .desk-menu-panel .desk-action{min-height:44px}\n}\n\n.study-desk[data-vibrant-view=\"true\"] :is(.desk-window,.field-pane,.route-sheet,.route-card){\n  --vibrant-base:var(--pane-accent,var(--color,#3c6e93));\n  --vibrant-accent:var(--vibrant-base);\n  --vibrant-text:color-mix(in srgb,var(--vibrant-base) 68%,#fff);\n}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"library\"] :is(.desk-window,.route-sheet,.route-card),\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"classic\"] :is(.desk-window,.route-sheet,.route-card){--vibrant-text:color-mix(in srgb,var(--vibrant-base) 88%,#12151b)}\n@supports(color:oklch(from #38749a l c h)){\n  .study-desk[data-vibrant-view=\"true\"] :is(.desk-window,.field-pane,.route-sheet,.route-card){\n    --vibrant-accent:oklch(from var(--vibrant-base) clamp(.46,calc(l + .02),.54) calc(c * 1.18) h);\n    --vibrant-text:oklch(from var(--vibrant-base) .72 calc(c * 1.15) h);\n  }\n  .study-desk[data-vibrant-view=\"true\"][data-skin=\"library\"] :is(.desk-window,.route-sheet,.route-card),\n  .study-desk[data-vibrant-view=\"true\"][data-skin=\"classic\"] :is(.desk-window,.route-sheet,.route-card){--vibrant-text:oklch(from var(--vibrant-base) .40 calc(c * 1.15) h)}\n}\n.study-desk[data-vibrant-view=\"true\"] :is(.window-titlebar,.care-section>summary,.route-sheet h3,.pane-top,.field-section>summary){background:linear-gradient(110deg,var(--vibrant-accent),color-mix(in srgb,var(--vibrant-accent) 87%,#07101b));color:#fffaf4}\n.study-desk[data-vibrant-view=\"true\"] :is(.window-titlebar,.care-section>summary,.route-sheet h3,.pane-top,.field-section>summary)>small{color:#fffaf4;opacity:.8}\n.study-desk[data-vibrant-view=\"true\"] :is(.pane-kicker,.axiom-id,.route-card-id,.inspect-id,.trace-card strong,.reader-pane-code,.passage-address,.item-address,.pane-intro .kicker){color:var(--vibrant-text)}\n.study-desk[data-vibrant-view=\"true\"] .source-copy .passage-address{color:var(--vibrant-text)}\n/* Sliders use the lighter label colour; their geometry is unchanged. */\n.study-desk[data-vibrant-view=\"true\"] .pane-slider{--pane-accent:var(--vibrant-text)}\n.study-desk[data-vibrant-view=\"true\"] :is(.desk-window,.field-pane){filter:none;opacity:1}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"]{\n  --desk-paper:#090d15;--desk-ink:#f8f4ec;\n  --beautiful-paper:#090d15;--beautiful-ink:#f8f4ec;--beautiful-muted:#c4bdaf;\n  background:#060910;border-color:#273344;color:#f8f4ec;\n}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] .desk-strip{background:#060910}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.desk-toolbar,.desk-status){background:#0c111b;border-color:#273344}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.desk-menu-panel,.slider-jump-menu,.build-version-menu){background:#101724;border-color:#35445a;color:#f8f4ec}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.desk-window,.window-body,.source-copy,.care-head,.care-sections,.axiom-list,.pane-slider,.route-focus,.route-source-copy,.inspector-content){--desk-paper:#090d15;background:#090d15;color:#f8f4ec}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.care-section,.route-sheet,.route-card,.route-source-card,.inspect-text,.trace-card){background-color:#0c121e;border-color:#273344}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.axiom-text,.passage,.route-card-text,.inspect-text,.source-head h2,.care-head h2){color:#f8f4ec}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.axiom-trace,.route-card-via,.inspect-meta){color:#a5b2c3}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] .desk-window.pane-focused{border-color:color-mix(in srgb,var(--vibrant-accent) 56%,#273344)}\n/* Light belongs to the lettering, not a glaze across the colour blocks. */\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.pane-kicker,.axiom-id,.route-card-id,.inspect-id,.reader-pane-code,.passage-address,.slider-heading>span,.slider-stop.active .slider-stop-label){text-shadow:0 0 7px color-mix(in srgb,var(--vibrant-text) 20%,transparent)}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.source-head h2,.care-head h2,.desk-title strong){text-shadow:0 0 9px #c5d9ed20}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.window-titlebar strong,.care-section>summary,.route-sheet h3,.desk-menu-trigger){text-shadow:0 0 6px #e4efff28}\n.study-desk[data-vibrant-view=\"true\"][data-skin=\"care\"] :is(.desk-menu-trigger svg,.reader-route-action svg,.reader-axiom-mark svg){filter:drop-shadow(0 0 3px #b8d4e524)}\n/* Standalone field readers share the same dark palette and saved preference. */\n.field-desk[data-vibrant-view=\"true\"]{--bg:#060910;--panel:#090d15;--line:#273344;--text:#f8f4ec;--muted:#a5b2c3;background:#060910;color:#f8f4ec}\n.field-desk[data-vibrant-view=\"true\"] :is(.field-strip,.field-pane,.pane-body,.pane-intro,.field-sections){background:#090d15}\n.field-desk[data-vibrant-view=\"true\"] :is(.field-head,.field-status,.field-nav){background:#0c111b;border-color:#273344}\n.field-desk[data-vibrant-view=\"true\"] :is(.item-copy,.item-prose,.pane-intro h3,.field-prose){color:#f8f4ec}\n.field-desk[data-vibrant-view=\"true\"] .item-trace{color:#a5b2c3}\n.field-desk[data-vibrant-view=\"true\"] :is(.item-address,.pane-intro .kicker,.reader-pane-code){text-shadow:0 0 7px color-mix(in srgb,var(--vibrant-text) 20%,transparent)}\n.field-desk[data-vibrant-view=\"true\"] :is(.pane-intro h3,.lateral-reader-title strong,.pane-top strong,.field-section>summary){text-shadow:0 0 9px #c5d9ed20}\n\n.care-reading-text {font-family:var(--care-reader-font-family,\"Iowan Old Style\",\"Palatino Linotype\",Palatino,Georgia,serif);font-size:1.08rem;line-height:1.78;color:inherit;max-width:72ch;margin:0 auto;overflow-wrap:anywhere;}\n.care-reading-text p {margin:0 0 1.05em;line-height:inherit;}\n.care-reading-text h1,.care-reading-text h2,.care-reading-text h3,.care-reading-text h4,.care-reading-text h5,.care-reading-text h6 {font-family:inherit;line-height:1.3;font-weight:600;margin:1.6em 0 .65em;letter-spacing:-.015em;}\n.care-reading-text h1 {font-size:1.85em;}.care-reading-text h2 {font-size:1.5em;}.care-reading-text h3 {font-size:1.25em;}\n.care-reading-text>:first-child {margin-top:0;}\n.care-reading-text [data-source-rubric],.care-reading-inline [data-source-rubric] {color:var(--care-rubric-color,#b4232d);}\n.care-reading-text img {display:block;max-width:100%;max-height:80vh;width:auto;height:auto;object-fit:contain;margin:1.35em auto;}\n.care-reading-text figure {margin:1.4em 0;}.care-reading-text figcaption {font-size:.88em;line-height:1.55;text-align:center;opacity:.78;margin:.55em 0 1.3em;}\n.care-reading-text .care-reading-table {max-width:100%;overflow-x:auto;margin:1.2em 0;}\n.care-reading-text table {border-collapse:collapse;min-width:50%;max-width:100%;font-size:.94em;line-height:1.5;}\n.care-reading-text th,.care-reading-text td {padding:.5em .75em;text-align:start;vertical-align:top;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent);}\n.care-reading-text th {font-weight:600;}.care-reading-text blockquote {margin:1.1em 0;padding:.15em 0 .15em 1.25em;border-left:2px solid color-mix(in srgb,currentColor 25%,transparent);}\n.care-reading-text ul,.care-reading-text ol {padding-left:1.6em;margin:.5em 0 1.05em;}.care-reading-text li {margin:.25em 0;}\n.care-reading-text pre {white-space:pre-wrap;overflow-x:auto;font-size:.85em;line-height:1.55;padding:.8em 1em;border-radius:.45em;background:color-mix(in srgb,currentColor 5%,transparent);}\n.care-reading-text code {font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;}.care-reading-text pre code {font-size:inherit;}\n.care-reading-text .care-reading-math {font-family:\"Cambria Math\",STIXGeneral,serif;white-space:pre-wrap;}.care-reading-text .care-reading-math-block {display:block;text-align:center;margin:1em 0;}\n.care-reading-text sup,.care-reading-text sub {font-size:.72em;line-height:0;}.care-reading-text a {color:inherit;text-decoration:underline;text-underline-offset:.16em;}\n.care-reading-text .care-reading-figure-label {display:block;font-size:.9em;font-style:italic;opacity:.72;margin:1em 0;}.care-reading-text hr {border:0;border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);margin:1.5em 0;}\n\n.study-desk .care-reading-text{font-size:inherit;line-height:inherit;color:inherit}";
const CORPUS_ROUTES_NATIVE_CSS = "\n.corpus-route-tools{display:grid;gap:2px}\n.corpus-route-tools button{white-space:normal}\n.corpus-route-tools small{padding:.3rem .5rem;font-size:.65rem;color:var(--desk-muted)}\n.window-body[data-corpus-route-reading]{scroll-padding-block:24px}\n";
const CORPUS_PANE_FOLDS_CSS = "\n.care-pane-controls button[data-pane-control=\"sections\"]{background:color-mix(in srgb,#c7b174 88%,var(--pane-accent,#736486))}\n.study-desk .desk-window.corpus-pane-title-folded{align-self:flex-start!important;height:var(--corpus-folded-title-height,44px)!important;min-height:0!important;max-height:var(--corpus-folded-title-height,44px)!important}\n.study-desk .desk-window.corpus-pane-title-folded>.window-titlebar{height:100%!important;min-height:0!important;max-height:none!important;border-bottom:0}\n.study-desk .desk-window.corpus-pane-title-folded>:not(.window-titlebar){display:none!important}\n/* A compact source row has exactly one title's height. Native strip padding or\n   a horizontal scrollbar must not consume the bottom of that rounded title. */\n.study-desk.corpus-titles-compact .desk-strip{padding:0!important;scrollbar-width:none!important}\n.study-desk.corpus-titles-compact .desk-strip::-webkit-scrollbar{height:0!important;display:none!important}\n";
const CORPUS_BOOK_READER = (() => {

const INSTANCES = new WeakMap()
// A framework cleanup can arrive after the next render. Dispose the previous
// render before binding the next one, and make delayed cleanups harmless.
function ownStudyDeskCleanup(runtime,cleanup){
  let disposed=false
  const dispose=()=>{
    if(runtime.renderCleanup!==dispose){
      // Local cached navigation may render again before the framework receives
      // another payload. Its older cleanup still owns eventual host unmount.
      Promise.resolve().then(()=>{if(runtime.root?.isConnected===false)runtime.renderCleanup?.()})
      return
    }
    if(disposed)return
    disposed=true;runtime.renderCleanup=null;cleanup()
  }
  dispose.resources=cleanup
  runtime.renderCleanup=dispose
  return dispose
}
function beginStudyDeskRender(runtime){
  runtime.renderCleanup?.()
  return cleanup=>ownStudyDeskCleanup(runtime,cleanup)
}
function studyDeskContentContext(data,name){
  const context=String(data?.[name]||''),revision=String(data?.content_revision||'')
  // Only the explicit freshness token is nonvisual. Keep chapter, language,
  // edition and connection choices, including contexts from older callers.
  return revision?context.replace(revision,''):context
}
function studyDeskWorkspaceContext(data){
  return JSON.stringify([studyDeskContentContext(data,'workspace_context'),studyDeskContentContext(data,'outline_context')])
}
function studyDeskRenderSignature(data){
  return JSON.stringify({...data,navigation_preload:null,navigation_request_id:null,content_revision:null,workspace_context:studyDeskContentContext(data,'workspace_context'),outline_context:studyDeskContentContext(data,'outline_context'),selected_axiom:null,selected_work_ids:null,connection:data?.connection?{...data.connection,selection:null}:null})
}
function studyNavigationEligible(data){
  return !!(data?.local_navigation_enabled&&data.mode==='workspace'&&data.stack?.work?.id&&data.content_revision&&(!data.reference||['axiom','passage'].includes(data.reference.kind)&&!data.reference.preserved)&&!data.connection&&!data.dialogue_media&&!data.corpus_sheet&&!data.corpus_build)
}
function studyNavigationScope(data){
  return studyNavigationEligible(data)?JSON.stringify([data.stack.work.id,data.navigation_context||data.content_revision,data.navigation_context||data.outline_context||'',data.selected_build_id||'',data.version||'']):''
}
function studyNavigationKey(layer,id,raw=''){return JSON.stringify([layer==='SOURCE'?'':String(raw||''),String(layer),String(id)])}
function studyNavigationReadingAnchor(runtime){return String(runtime.data?.navigation_reading_anchor||runtime.data?.stack?.active_raw_unit_id||'')}
function studyNavigationStackKey(data){const stack=data?.stack||{};return JSON.stringify([stack.work?.id,stack.active_raw_unit_id,stack.active_unit_id,arr(stack.care_path).map(unit=>unit.reader_option_id||unit.id),data?.reference?.id||'',data?.reference?.route_mode||''])}
function studyNavigationState(runtime){
  return runtime.navigation||(runtime.navigation={scope:'',cache:new Map(),bytes:0,contentBytes:0,contentOrder:new Map(),units:new Map(),chapters:new Map(),routes:new Map(),plans:new Map(),requested:new Set(),sequence:0,budgetWork:'',budgetStart:0,budgetCount:0,completed:new Set(),confirmed:'',prefetchAnchor:'',actions:[],desired:null,inflight:null,actionWaiting:false,prefetch:null,prefetchTimer:null,retries:new Map(),pumpTimer:null,idle:null})
}
function studyNavigationRequest(runtime,layer,id,raw){
  const state=studyNavigationState(runtime)
  return {layer,id:String(id),raw_unit_id:String(raw||''),key:studyNavigationKey(layer,id,raw),work_id:String(runtime.data?.stack?.work?.id||''),request_id:`reading-${Date.now()}-${++state.sequence}`}
}
function studyNavigationRemember(runtime,request,data){
  const state=studyNavigationState(runtime)
  if(!request||!studyNavigationEligible(data)||!studyNavigationMatches(request,data))return
  const snapshot={stack:data.stack,workspace_context:data.workspace_context,navigation_reading_anchor:data.navigation_reading_anchor||data.stack.active_raw_unit_id||'',reference:data.reference||null,selected_reference_id:data.selected_reference_id||'',route_mode:data.route_mode||'incoming'},bytes=JSON.stringify(snapshot).length*2
  if(bytes>8*1024*1024)return
  const previous=state.cache.get(request.key);if(previous)state.bytes-=previous.bytes
  state.cache.delete(request.key);state.cache.set(request.key,{...snapshot,bytes});state.bytes+=bytes
  while(state.cache.size>12||state.bytes>12*1024*1024){const key=state.cache.keys().next().value;state.bytes-=state.cache.get(key).bytes;state.cache.delete(key)}
}
function studyNavigationMatches(request,data){return request.layer==='READING'?!data.reference&&studyNavigationStackKey(data)===request.returnStackKey:request.layer==='ROUTE'?String(data.reference?.id||'')===request.id:request.layer==='SOURCE'?String(data.stack?.active_raw_unit_id||'')===request.id:String(data.stack?.active_unit_id||'')===request.id}
function studyNavigationIngest(runtime,data){
  const state=studyNavigationState(runtime),batch=data.navigation_preload
  if(state.prefetch&&state.prefetch.request_id===batch?.request_id){
    for(const target of state.prefetch.targets)state.requested.add(studyNavigationKey(target.layer,target.id,target.raw_unit_id))
    state.prefetch=null
    runtime.root.ownerDocument.defaultView?.clearTimeout?.(state.prefetchTimer);state.prefetchTimer=null
  }
  if(!batch||batch.work_id!==data.stack?.work?.id||batch.content_revision!==data.content_revision||batch.outline_context!==data.outline_context)return
  // Keep only a bounded working set even for books with thousands of chapters.
  const add=(kind,rows)=>{for(const [key,value] of Object.entries(rows||{})){
    const token=kind+'|'+key,previous=state.contentOrder.get(token),bytes=previous?.bytes??JSON.stringify(value).length*2
    if(bytes>8*1024*1024)continue
    if(previous)state.contentBytes-=previous.bytes
    state.contentOrder.delete(token);state.contentOrder.set(token,{kind,key,bytes});state.contentBytes+=bytes
    state[kind].delete(key);state[kind].set(key,value)
  }}
  add('units',batch.units);add('chapters',batch.chapters);add('routes',batch.routes)
  while(state.contentBytes>24*1024*1024||state.units.size>160||state.chapters.size>80||state.routes.size>16){
    const [token,row]=state.contentOrder.entries().next().value;state.contentOrder.delete(token);state[row.kind].delete(row.key);state.contentBytes-=row.bytes
  }
  for(const [key,value] of Object.entries(batch.destinations||{})){state.plans.delete(key);state.plans.set(key,value)}
  while(state.plans.size>320)state.plans.delete(state.plans.keys().next().value)
}
function studyNavigationRenderData(runtime,data,previous,local){
  if(!local||!studyNavigationEligible(data)||data.reference||previous?.reference||previous?.stack?.work?.id!==data.stack.work.id)return data
  const retained=[],old=new Map(arr(previous.stack.care_path).map(unit=>[String(unit.id),unit]))
  for(const unit of arr(data.stack.care_path)){
    const before=old.get(String(unit.id))
    if(before&&(before===unit||JSON.stringify(before)===JSON.stringify(unit))&&runtime.root.querySelector(`[data-pane="${CSS.escape(String(unit.id))}"]`))retained.push(String(unit.id))
  }
  if(data.stack.active_chapter&&previous.stack.active_chapter&&(data.stack.active_chapter===previous.stack.active_chapter||JSON.stringify(data.stack.active_chapter)===JSON.stringify(previous.stack.active_chapter)))retained.push('source')
  const sliders=[...runtime.root.querySelectorAll('[data-sheet-slider]')].filter(input=>!input.closest('[data-connection-book]')&&input.dataset.sheetSlider!=='ORIGINAL').map(input=>input.dataset.sheetSlider)
  return {...data,retained_reading_panes:retained,stack:{...data.stack,retained_slider_layers:sliders}}
}
function studyNavigationPlan(state,request){
  const direct=state.plans.get(request.key)
  if(direct||request.layer!=='CH')return direct
  // CH selects its own source regardless of the previous source anchor.
  // A verified Source plan already contains that identical CH and ancestry.
  return [...state.plans.entries()].find(([key,plan])=>JSON.parse(key)[1]==='SOURCE'&&plan.active_unit_id===request.id&&arr(plan.care_path_keys).some(key=>state.units.get(key)?.type==='CH'&&state.units.get(key)?.id===request.id))?.[1]
}
function studyNavigationSnapshot(runtime,request){
  const state=studyNavigationState(runtime),cached=state.cache.get(request.key)
  if(request.layer==='READING')return state.readingReturn||null
  if(cached){state.cache.delete(request.key);state.cache.set(request.key,cached);return cached}
  if(request.layer==='ROUTE'){
    const route=state.routes.get(request.key)
    if(!route?.stack||!route.reference||route.reference.id!==request.id||route.reference.preserved||route.stack.work?.id!==runtime.data?.stack?.work?.id||route.stack.original_reader?.id!==runtime.data?.stack?.original_reader?.id)return null
    return {stack:route.stack,reference:route.reference,route_mode:route.route_mode||route.reference.route_mode||'incoming',selected_reference_id:request.id,workspace_context:route.workspace_context||runtime.data.workspace_context,navigation_reading_anchor:request.raw_unit_id}
  }
  const plan=studyNavigationPlan(state,request),current=runtime.data?.stack
  if(!plan||!current||!Array.isArray(plan.care_path_keys))return null
  const panes=plan.care_path_keys.map(key=>state.units.get(key)),chapter=plan.chapter_key?state.chapters.get(plan.chapter_key):null
  if(panes.some(unit=>!unit)||(plan.chapter_key&&!chapter))return null
  if(plan.original_reader_id&&plan.original_reader_id!==current.original_reader?.id)return null
  const original=current.original_reader?{...current.original_reader,initial_location_id:plan.original_location_id||current.original_reader.initial_location_id}:current.original_reader
  return {stack:{...current,care_path:panes,active_chapter:chapter,active_raw_unit_id:plan.active_raw_unit_id,active_unit_id:plan.active_unit_id,original_reader:original},navigation_reading_anchor:plan.active_raw_unit_id,workspace_context:plan.workspace_context||`${request.layer==='SOURCE'?request.id:request.raw_unit_id}|${request.layer==='SOURCE'?'':request.id}|${runtime.data.content_revision}`}
}
function studyNavigationActionTarget(runtime){
  const state=studyNavigationState(runtime),stack=runtime.data?.stack||{}
  if(state.viewRequest&&state.viewStackKey===studyNavigationStackKey(runtime.data))return state.viewRequest
  if(runtime.data?.reference?.id)return studyNavigationRequest(runtime,'ROUTE',runtime.data.reference.id,studyNavigationReadingAnchor(runtime))
  const active=String(stack.active_unit_id||''),option=Object.entries(stack.sheet_options||{}).find(([,rows])=>arr(rows).some(row=>String(row.id)===active))
  return option?studyNavigationRequest(runtime,option[0],active,stack.active_raw_unit_id):studyNavigationRequest(runtime,'SOURCE',stack.active_raw_unit_id,stack.active_raw_unit_id)
}
function studyNavigationAPI(runtime,component){
  const state=studyNavigationState(runtime)
  const dispatch=(type,name,value)=>{
    const current=state.component||component
    if(name==='clear_reference'&&state.readingReturn&&studyNavigationChoose(runtime,'READING','return'))return
    if(name==='set_route_mode'&&runtime.data?.reference?.id&&['incoming','both','outgoing'].includes(value))state.modeIntent={id:runtime.data.reference.id,mode:value,attempts:0}
    if(!state.desired&&!state.inflight&&!state.actionWaiting){
      if(name==='set_route_mode'&&state.scope&&state.modeIntent){state.actionWaiting=true;state.modeIntent.attempts++}
      return current[type]?.(name,value)
    }
    if(['open_chapter','open_sheet','prepare_navigation'].includes(name))return current[type]?.(name,value)
    const target=studyNavigationActionTarget(runtime),key=[type,name,value?.care_unit_id||value?.care_item_id||''].join('|'),stackKey=studyNavigationStackKey(runtime.data)
    // Selection and explicit saved-state intentions supersede their older copy.
    state.actions=state.actions.filter(action=>action.key!==key||action.stackKey!==stackKey)
    state.actions.push({type,name,value,target,key,stackKey});studyNavigationSchedule(runtime)
  }
  return {setTriggerValue:(name,value)=>dispatch('setTriggerValue',name,value),setStateValue:(name,value)=>dispatch('setStateValue',name,value)}
}
function studyNavigationActionCompatible(action,data){
  if(action.stackKey===studyNavigationStackKey(data))return true
  if(action.target?.layer!=='ROUTE'||action.target.id!==data?.reference?.id)return false
  const value=action.value||{},item=value.care_item_id||value.axiom_id||value.passage_id
  if(item)return studyNavigationRouteAvailable(data,item)
  if(value.care_unit_id)return arr(data.stack?.care_path).some(unit=>String(unit.id)===String(value.care_unit_id))
  return ['set_route_mode','clear_reference','navigate_route'].includes(action.name)
}
function studyNavigationSchedule(runtime){
  const state=studyNavigationState(runtime),view=runtime.root.ownerDocument.defaultView
  if(state.pumpTimer!==null||!view?.setTimeout)return
  state.pumpTimer=view.setTimeout(()=>{state.pumpTimer=null;studyNavigationPump(runtime)},0)
}
function studyNavigationPump(runtime){
  const state=studyNavigationState(runtime),component=state.component
  if(!component||!state.scope||state.inflight||state.actionWaiting||runtime.sliderGesture||runtime.root.isConnected===false)return
  const action=state.actions[0]
  if(action&&studyNavigationActionCompatible(action,state.authority)){
    state.actions.shift();state.actionWaiting=true
    if(action.name==='set_route_mode'&&state.modeIntent)state.modeIntent.attempts++
    component[action.type]?.(action.name,action.value);return
  }
  let request=action?.target||state.desired
  if(!request){
    const intent=state.modeIntent
    if(intent&&intent.id===state.authority?.reference?.id&&intent.mode!==state.authority.reference.route_mode&&intent.attempts<2){intent.attempts++;state.actionWaiting=true;component.setTriggerValue?.('set_route_mode',intent.mode)}
    return
  }
  if(request.prerequisite&&!state.completed.has(request.prerequisite.request_id))request=request.prerequisite
  state.inflight=request
  component.setTriggerValue?.(request.layer==='READING'?'clear_reference':request.layer==='ROUTE'?'open_reference':request.layer==='SOURCE'?'open_chapter':'open_sheet',{id:request.id,request_id:request.request_id,work_id:request.work_id,...(request.layer==='SOURCE'?{}:{raw_unit_id:request.raw_unit_id})})
}
function studyNavigationReceive(runtime,component,local=false){
  const state=studyNavigationState(runtime),data=component.data||{}
  if(local)return data
  const scope=studyNavigationScope(data)
  if(scope!==state.scope){
    if(state.scope&&state.budgetCount)state.revisionChurn=true
    const intended=state.desired,sameBook=String(runtime.data?.stack?.work?.id||'')===String(data.stack?.work?.id||'')
    const view=runtime.root.ownerDocument.defaultView
    if(state.pumpTimer!==null)view?.clearTimeout?.(state.pumpTimer)
    if(state.prefetchTimer!==null)view?.clearTimeout?.(state.prefetchTimer)
    if(state.idle!==null){view?.cancelIdleCallback?.(state.idle);view?.clearTimeout?.(state.idle)}
    Object.assign(state,{scope,cache:new Map(),bytes:0,contentBytes:0,contentOrder:new Map(),units:new Map(),chapters:new Map(),routes:new Map(),plans:new Map(),requested:new Set(),actions:[],desired:null,inflight:null,actionWaiting:false,prefetch:null,prefetchTimer:null,retries:new Map(),pumpTimer:null,idle:null,viewRequest:null,completed:new Set(),confirmed:'',prefetchAnchor:'',routePriority:'',lastPrefetchRoute:true,modeIntent:null,readingReturn:null})
    // A source refresh invalidates cached prose, not the user's newest intent.
    if(scope&&sameBook&&intended&&data.navigation_request_id!==intended.request_id&&(intended.layer==='ROUTE'?studyNavigationRouteAvailable(data,intended.id):sliderOptions(data.stack,intended.layer).some(option=>String(option.id)===intended.id)))state.desired={...intended,request_id:`reading-${Date.now()}-${++state.sequence}`}
  }
  const incomingAck=String(data.navigation_request_id||'')
  if(scope&&incomingAck&&state.completed.has(incomingAck)&&incomingAck!==state.confirmed)return runtime.data
  state.component=component;state.authority=data
  if(state.modeIntent&&state.modeIntent.id===data.reference?.id&&state.modeIntent.mode===data.reference?.route_mode)state.modeIntent.attempts=0
  if(!scope)return data
  studyNavigationIngest(runtime,data)
  const request=state.inflight,ack=String(data.navigation_request_id||'')
  if(request&&ack===request.request_id){
    studyNavigationRemember(runtime,request,data);state.inflight=null
    state.completed.add(ack);state.confirmed=ack
    while(state.completed.size>64)state.completed.delete(state.completed.values().next().value)
    if(state.desired?.request_id===ack){state.desired=null;state.viewRequest=studyNavigationMatches(request,data)?request:null;state.viewStackKey=studyNavigationStackKey(data)}
  }else if(state.actionWaiting)state.actionWaiting=false
  if(!state.desired&&!state.inflight&&state.modeIntent&&state.modeIntent.id!==data.reference?.id)state.modeIntent=null
  // A response for an earlier choice may update saved controls, but cannot
  // replace the newer exact stack already displayed in this browser.
  const result=state.desired&&runtime.data&&studyNavigationScope(runtime.data)===scope?
    {...data,stack:runtime.data.stack,reference:runtime.data.reference,route_mode:runtime.data.route_mode,selected_reference_id:runtime.data.selected_reference_id,navigation_reading_anchor:runtime.data.navigation_reading_anchor,workspace_context:runtime.data.workspace_context,selected_axiom:runtime.data.selected_axiom,saved_focus:null}:data
  studyNavigationSchedule(runtime)
  return result
}
function studyNavigationChoose(runtime,layer,id){
  if(!studyNavigationEligible(runtime.data)||runtime.readerView==='outline'||!runtime.renderNavigation||(runtime.data.reference&&!['ROUTE','READING'].includes(layer)))return false
  if(layer==='ROUTE'&&!studyNavigationRouteAvailable(runtime.data,id))return false
  if(layer==='READING'&&!studyNavigationState(runtime).readingReturn)return false
  const state=studyNavigationState(runtime),request=studyNavigationRequest(runtime,layer,id,layer==='ROUTE'?studyNavigationReadingAnchor(runtime):runtime.data.stack.active_raw_unit_id)
  if(layer==='ROUTE'&&!runtime.data.reference){
    const data=runtime.data
    state.readingReturn={stack:data.stack,workspace_context:data.workspace_context,navigation_reading_anchor:studyNavigationReadingAnchor(runtime),reference:null,selected_reference_id:'',route_mode:'incoming'}
  }
  if(layer==='READING')request.returnStackKey=studyNavigationStackKey({...runtime.data,...state.readingReturn})
  if(layer==='ROUTE'&&state.desired)request.prerequisite=state.desired.layer==='ROUTE'?state.desired.prerequisite:state.desired
  if(state.desired?.key===request.key)return true
  const snapshot=studyNavigationSnapshot(runtime,request)
  if(!state.desired&&!state.inflight)studyNavigationRemember(runtime,studyNavigationActionTarget(runtime),runtime.data)
  state.desired=request
  if(snapshot){
    state.viewRequest=request;state.viewStackKey=studyNavigationStackKey({...runtime.data,...snapshot})
    // Only the exact reading stack is replayed; live bookmarks, menus and
    // callback state always come from the most recent authoritative payload.
    runtime.renderNavigation({...runtime.data,...snapshot,selected_axiom:null,saved_focus:null})
  }else runtime.root.setAttribute('aria-busy','true')
  studyNavigationSchedule(runtime)
  return true
}
function studyNavigationRouteAvailable(data,id){
  if(!id)return false
  return [...arr(data?.stack?.active_chapter?.passages),...arr(data?.stack?.care_path).flatMap(unit=>arr(unit.sections).flatMap(section=>arr(section.items))),...(data?.reference?[data.reference,...Object.values(data.reference.route_layers||{}).flatMap(arr)]:[])].some(item=>String(item.id||item.care_item_id||'')===String(id)&&(!item.work_id||item.work_id===data?.stack?.work?.id))
}
function studyNavigationPrioritizeRoute(runtime,id){
  if(!studyNavigationEligible(runtime.data)||!studyNavigationRouteAvailable(runtime.data,id))return
  studyNavigationState(runtime).routePriority=String(id);studyNavigationPrefetch(runtime)
}
function studyNavigationVisibleRoutes(runtime){
  const result=[],root=runtime.root,bounds=root.getBoundingClientRect?.()
  if(!bounds)return result
  const buttons=[...(root.querySelectorAll?.('[data-select-axiom],[data-ref-id]:not(.passage):not(.route-source-card)')||[]),...(root.querySelectorAll?.('[data-select-passage],.passage[data-ref-id],.route-source-card[data-ref-id]')||[])]
  for(const button of buttons){
    if(button.disabled||button.hidden||button.closest?.('details:not([open])'))continue
    const rect=button.getBoundingClientRect?.(),pane=button.closest?.('.window-body')?.getBoundingClientRect?.()
    if(!rect||!rect.width||!rect.height||rect.bottom<=Math.max(bounds.top,pane?.top??bounds.top)||rect.top>=Math.min(bounds.bottom,pane?.bottom??bounds.bottom)||rect.right<=bounds.left||rect.left>=bounds.right)continue
    const id=button.dataset.selectAxiom||button.dataset.selectPassage||button.dataset.refId
    if(id&&!result.includes(id))result.push(id)
    if(result.length>=8)break
  }
  return result
}
function studyNavigationPrefetch(runtime){
  const state=studyNavigationState(runtime),view=runtime.root.ownerDocument.defaultView,data=runtime.data
  if(!studyNavigationEligible(data)||runtime.readerView==='outline'||state.prefetch||state.desired||state.inflight||state.actions.length||state.actionWaiting||runtime.sliderGesture||state.idle!==null||!data.navigation_preload_enabled)return
  const now=Date.now(),work=String(data.stack.work.id)
  if(state.budgetWork!==work||now-state.budgetStart>=30000){state.budgetWork=work;state.budgetStart=now;state.budgetCount=0;state.reservedCount=0;state.revisionChurn=false}
  const batchBudget=!state.revisionChurn&&arr(data.stack.chapters).length<=64?24:6
  if(state.budgetCount>=batchBudget&&(!state.routePriority||(state.reservedCount||0)>=2))return
  const run=()=>{
    state.idle=null
    if(studyNavigationScope(runtime.data)!==state.scope||state.desired||state.inflight||state.prefetch||runtime.sliderGesture||!runtime.root.isConnected)return
    const stack=runtime.data.stack,raw=runtime.data.reference?studyNavigationReadingAnchor(runtime):String(stack.active_raw_unit_id||'');if(state.prefetchAnchor!==raw){state.prefetchAnchor=raw;state.requested.clear()}
    const chapters=arr(stack.chapters).filter(row=>row.readable!==false),index=Math.max(0,chapters.findIndex(row=>String(row.raw_unit_id)===raw)),targets=[]
    const add=(layer,id,anchor='')=>{const key=studyNavigationKey(layer,id,anchor);const plan=studyNavigationPlan(state,{key,layer,id}),ready=layer==='ROUTE'?state.routes.has(key):plan&&arr(plan.care_path_keys).every(key=>state.units.has(key))&&(!plan.chapter_key||state.chapters.has(plan.chapter_key));if(!state.requested.has(key)&&!ready&&!state.cache.has(key)&&!targets.some(row=>row.key===key))targets.push({layer,id:String(id),raw_unit_id:anchor,key})}
    const priorityKey=studyNavigationKey('ROUTE',state.routePriority,raw)
    if(state.routePriority&&(state.routePriority===runtime.data.reference?.id||!studyNavigationRouteAvailable(runtime.data,state.routePriority)||state.requested.has(priorityKey)||state.routes.has(priorityKey)||state.cache.has(priorityKey)))state.routePriority=''
    const reserved=state.budgetCount>=batchBudget
    if(reserved&&(!state.routePriority||(state.reservedCount||0)>=2))return
    const addRoute=()=>{for(const id of [state.routePriority,runtime.selectedAxiom?.axiom_id||runtime.selectedAxiom?.passage_id,...studyNavigationVisibleRoutes(runtime)]){
      if(id!==runtime.data.reference?.id&&studyNavigationRouteAvailable(runtime.data,id))add('ROUTE',id,raw)
      if(targets.length)break
    }}
    if(runtime.data.reference||!state.lastPrefetchRoute||state.routePriority)addRoute()
    const routeBatch=targets.some(target=>target.layer==='ROUTE')
    if(!runtime.data.reference&&!routeBatch)for(let distance=0;distance<Math.min(chapters.length,32)&&targets.length<2;distance++)for(const position of distance?[index+distance,index-distance]:[index]){if(chapters[position])add('SOURCE',chapters[position].raw_unit_id,'');if(targets.length>=2)break}
    const layers=new Set(runtime.data.reference||routeBatch?[]:Object.keys(stack.sheet_options||{}).filter(layer=>!['ORIGINAL','SOURCE','MC'].includes(layer)))
    if(!runtime.data.reference&&!routeBatch)for(const option of arr(stack.sheet_options?.MC))layers.add(sheetLayerKey({...option,type:'MC'}))
    const groups=[...layers].map(layer=>[layer,sliderOptions(stack,layer)])
    for(let distance=1;distance<=8&&targets.length<3;distance++)for(const [layer,options] of groups){
      const current=arr(stack.care_path).find(unit=>sheetLayerKey(unit)===layer||unit.type===layer),position=Math.max(0,arr(options).findIndex(option=>String(option.id)===String(current?.reader_option_id||current?.id)))
      for(const index of [position+distance,position-distance])if(options[index])add(layer,options[index].id,raw)
      if(targets.length>=3)break
    }
    targets.splice(3)
    if(!targets.length)addRoute()
    if(!targets.length)return
    const request={work_id:String(stack.work.id),request_id:`preload-${Date.now()}-${++state.sequence}`,content_revision:runtime.data.content_revision,outline_context:runtime.data.outline_context,targets:targets.map(({key,...target})=>target),known_unit_keys:[...state.units.keys()],known_chapter_keys:[...state.chapters.keys()]}
    state.prefetch=request;state.budgetCount++;if(reserved)state.reservedCount=(state.reservedCount||0)+1;state.lastPrefetchRoute=request.targets.some(target=>target.layer==='ROUTE')
    if(request.targets.some(target=>target.layer==='ROUTE'&&target.id===state.routePriority))state.routePriority=''
    for(const target of request.targets){const key=studyNavigationKey(target.layer,target.id,target.raw_unit_id);state.retries.set(key,(state.retries.get(key)||0)+1)}
    state.component?.setTriggerValue?.('prepare_navigation',request)
    state.prefetchTimer=view.setTimeout?.(()=>{
      if(state.prefetch?.request_id!==request.request_id)return
      state.prefetch=null;state.prefetchTimer=null
      for(const target of request.targets){const key=studyNavigationKey(target.layer,target.id,target.raw_unit_id);if((state.retries.get(key)||0)>=2)state.requested.add(key)}
      studyNavigationPrefetch(runtime)
    },15000)??null
  }
  // Let the opened book paint before preparing any offscreen chapter.
  state.idle=view.requestIdleCallback?view.requestIdleCallback(run):view.setTimeout?.(run,50)??null
}

function refreshStudyDeskOutlineContext(runtime,data){
  const previous=runtime.data||{},work=String(data?.stack?.work?.id||'')
  if(work!==String(previous.stack?.work?.id||'')||previous.outline_context===data?.outline_context||
    studyDeskContentContext(previous,'outline_context')!==studyDeskContentContext(data,'outline_context'))return false
  const oldKey=`${work}|${previous.outline_context||''}`,key=`${work}|${data?.outline_context||''}`,state=runtime.outlineBooks?.get(oldKey)
  if(!state)return false
  runtime.outlineBooks.delete(oldKey);runtime.outlineBooks.set(key,state)
  // Retain folds, positions and pending requests, but refill content from the
  // authoritative payload. Older browser-only cached sheets must be reread.
  state.cache.clear();state.errors.clear()
  return true
}
function reuseStudyDeskRender(runtime,component,signature){
  const data=component.data||{},cleanup=runtime.renderCleanup?.resources
  // Content revisions, explicit navigation and a remount still follow the
  // complete reconciliation path. Ordinary acknowledgements retain working
  // controls, observers, menus, selection, media and the current DOM in place.
  if(!cleanup||runtime.renderSignature!==signature||runtime.pendingSlider||runtime.pendingLayer||
    runtime.root.getAttribute?.('aria-busy')==='true')return null
  const refreshedOutline=refreshStudyDeskOutlineContext(runtime,data)
  runtime.api=studyNavigationAPI(runtime,component)
  runtime.data=data
  runtime.workspaceContext=data.workspace_context||''
  runtime.workspaceContentContext=studyDeskWorkspaceContext(data)
  if(refreshedOutline){
    runtime.ingestOutline?.()
    if(runtime.readerView==='outline')for(const group of runtime.outlineGroups||[])for(const option of group.options||[]){
      if(runtime.outlineState().open.has(option.id))runtime.requestOutline(option,group)
    }
  }
  if(data.mode==="library"){runtime.syncLibrarySelection?.(data);runtime.paintLibrarySelection?.()}
  if(!runtime.selectedAxiom)runtime.selectedAxiom=data.selected_axiom||null
  runtime.paintSelection()
  return ownStudyDeskCleanup(runtime,cleanup)
}
const esc = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character])
const arr = value => Array.isArray(value) ? value : []
const LAYER_COLORS = {"CB": "#a96624", "WB": "#9a4327", "MC": "#594f88", "CL": "#2d6b67", "CH": "#3d668b", "NUMO": "#3d765a", "XR": "#6e4f9a", "XS": "#8b4f86", "SC": "#8f394b", "XA": "#51667e"}

function mcLevel(value){
  if(value&&typeof value==='object'){
    for(const key of ['care_unit_id','unit_id','id','care_item_id','current_unit_id']){const level=mcLevel(value[key]);if(level)return level}
    for(const key of ['mc_level','unit_layer']){const raw=value[key];if((typeof raw==='number'||typeof raw==='string')&&/^[1-9][0-9]*$/.test(String(raw).trim()))return Number(raw)}
    return null
  }
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?value:null
  const identity=String(value||'').trim().split(':',1)[0];if(!/^MC_/i.test(identity))return null
  const levels=[...identity.matchAll(/_L([1-9][0-9]*)(?=_)/gi)];return levels.length?Number(levels[levels.length-1][1]):null
}
function mcLevelLabel(value){const level=mcLevel(value);return level?`MC L${level}`:'MC'}
function mcLevelColor(value){
  const level=mcLevel(value);if(!level)return '#594f88';
  const h=265/360,s=.28,l=(30+22*(1-Math.exp(-(level-1)/2.7)))/100;
  const m2=l<=.5?l*(1+s):l+s-l*s,m1=2*l-m2;
  const channel=offset=>{let hue=(h+offset+1)%1;const value=hue<1/6?m1+(m2-m1)*hue*6:hue<.5?m2:hue<2/3?m1+(m2-m1)*(2/3-hue)*6:m1;return Math.round(value*255).toString(16).padStart(2,'0')};
  return '#'+channel(1/3)+channel(0)+channel(-1/3)
}

const layerColor = (layer,identity=null) => String(layer||"").toUpperCase()==="MC"?mcLevelColor(identity):({...LAYER_COLORS,SOURCE:"#8a431d",PASSAGE:"#8a431d",TRACE:"#3d3d3d"})[String(layer||"").toUpperCase()] || "#333"
const readerLayerLabel = (layer,identity=null) => String(layer||"").toUpperCase()==="MC"?mcLevelLabel(identity):String(layer||"")
const textClip = (value, limit=250) => { const text=String(value??""); return text.length>limit ? `${text.slice(0,limit).trim()}…` : text }
const TEXT_SCALES = [.86,1,1.16,1.32]
const TEXT_SCALE_KEY = "care-study-desk-text-scale-v1"
const SKIN_KEY = "care-study-desk-skin-v2"
const LEGACY_SKIN_KEY = "care-study-desk-skin-v1"

const readerLayoutScale=(element,bounds)=>((bounds||element?.getBoundingClientRect?.())?.width/Number(element?.offsetWidth))||1
function trackZoomControls(){
  return `<div class="desk-track-zoom" role="group" aria-label="Book track zoom"><button type="button" class="desk-tab" data-track-zoom="fit" aria-pressed="false" title="Fit the whole Source to WB track inside this viewer">Fit track</button><button type="button" class="desk-tab" data-track-zoom="out" aria-label="Zoom out book track">−</button><button type="button" class="desk-tab" data-track-zoom="read" aria-label="Return to reading size" title="Return to reading size" data-track-zoom-label>100%</button><button type="button" class="desk-tab" data-track-zoom="in" aria-label="Zoom in book track" disabled>+</button></div>`
}
function trackFitScale(width,padding,gap,widths){
  const total=widths.reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0)
  if(!total||width<=padding)return 1
  // Leave a pixel for fractional layout rounding; gaps stay at viewer scale.
  return Math.min(1,Math.max(.001,(width-padding-Math.max(0,widths.length-1)*gap-1)/total))
}
function setupTrackZoom(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  runtime.trackZoomStates=new Map()
  runtime.trackZoomState=()=>{
    const key=String(runtime.data?.stack?.work?.id||"")+"|"+String(runtime.data?.connection?.id||"")+(isRouteReference(runtime.data?.reference)||runtime.data?.connection?.reference?"|route":"")+(runtime.readerView==="outline"?"|outline":"")
    if(!runtime.trackZoomStates.has(key))runtime.trackZoomStates.set(key,{mode:"read",scale:1})
    return runtime.trackZoomStates.get(key)
  }
  runtime.applyTrackZoom=()=>{
    const strip=root.querySelector("[data-strip]")
    if(!strip?.clientWidth)return
    const panes=[...strip.querySelectorAll(":scope > .desk-window")].filter(pane=>!pane.hidden)
    if(!panes.length)return
    const state=runtime.trackZoomState(),style=view.getComputedStyle(strip),current=Number(strip.dataset.trackScale)||1
    // A corpus can zoom the whole book above this local zoom level. Rectangles
    // include that ancestor scale; layout widths and padding do not.
    const ancestorScale=readerLayoutScale(strip)
    const widths=panes.map(pane=>pane.getBoundingClientRect().width/current/ancestorScale)
    const fit=trackFitScale(strip.clientWidth,(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0),parseFloat(style.columnGap)||0,widths)
    const scale=state.mode==="fit"?fit:state.mode==="read"?1:Math.max(fit,Math.min(1,state.scale))
    if(current===1&&scale<1&&!state.readingPositions)state.readingPositions=new Map(panes.map(pane=>[pane.dataset.pane,pane.querySelector(".window-body")?.scrollTop||0]))
    state.scale=scale;runtime.trackFit=fit
    strip.style.setProperty("--desk-track-scale",String(scale))
    strip.dataset.trackScale=String(scale)
    if(scale<1)strip.setAttribute("data-track-scaled","");else strip.removeAttribute("data-track-scaled")
    if(current<1&&scale===1&&state.readingPositions){panes.forEach(pane=>{const body=pane.querySelector(".window-body"),top=state.readingPositions.get(pane.dataset.pane);if(body&&top!==undefined)body.scrollTop=top});state.readingPositions=null}
    if(state.mode==="fit")strip.scrollLeft=0
    root.querySelectorAll("[data-track-zoom]").forEach(button=>{
      const action=button.dataset.trackZoom
      if(action==="fit"){button.classList.toggle("active",state.mode==="fit");button.setAttribute("aria-pressed",String(state.mode==="fit"))}
      if(action==="read"){button.textContent=`${Math.round(scale*100)}%`;button.setAttribute("aria-label",`Track at ${Math.round(scale*100)} percent. Return to reading size`)}
      if(action==="out")button.disabled=scale<=fit+.001
      if(action==="in")button.disabled=scale>=.999
    })
  }
  runtime.setTrackZoom=action=>{
    const state=runtime.trackZoomState()
    if(action==="fit")state.mode="fit"
    else if(action==="read"){state.mode="read";state.scale=1}
    else{
      const next=state.scale+(action==="in"?.1:-.1)
      state.mode=next>=.999?"read":next<=(runtime.trackFit||.01)+.001?"fit":"manual"
      state.scale=Math.min(1,Math.max(runtime.trackFit||.01,next))
    }
    runtime.applyTrackZoom();runtime.queueThreads()
  }
  runtime.queueTrackZoom=()=>{
    if(runtime.trackZoomFrame||!view?.requestAnimationFrame)return
    runtime.trackZoomFrame=view.requestAnimationFrame(()=>{runtime.trackZoomFrame=null;runtime.applyTrackZoom();runtime.queueThreads()})
  }
  const click=runtime.onClick
  runtime.onClick=event=>{
    const control=event.target?.closest?.("[data-track-zoom]"),action=control?.dataset?.trackZoom
    if(["fit","read","in","out"].includes(action)){
      event.preventDefault();if(control.disabled)return
      runtime.setTrackZoom(action)
      if(action==="read")runtime.focus(runtime.focused)
      return
    }
    const heading=event.target?.closest?.(".window-titlebar"),pane=heading?.closest("[data-pane]")
    if(pane&&runtime.trackZoomState().scale<.999&&!event.target.closest("button,input,select,a")){
      runtime.setTrackZoom("read");runtime.focus(pane.dataset.pane);return
    }
    if(event.target?.closest?.("[data-pane-target]")&&runtime.trackZoomState().scale<.999)runtime.setTrackZoom("read")
    return click(event)
  }
  const focus=runtime.focus
  runtime.focus=id=>{if(runtime.trackZoomState().scale<.999)runtime.setTrackZoom("read");return focus(id)}
  const skin=runtime.applySkin
  runtime.applySkin=()=>{skin();runtime.queueTrackZoom()}
  runtime.watchTrackZoom=()=>{
    runtime.applyTrackZoom()
    const strip=root.querySelector("[data-strip]")
    const resize=view?.ResizeObserver?new view.ResizeObserver(runtime.queueTrackZoom):null
    if(strip){resize?.observe(strip);strip.querySelectorAll(":scope > .desk-window").forEach(pane=>resize?.observe(pane))}
    const mutations=view?.MutationObserver?new view.MutationObserver(runtime.queueTrackZoom):null
    // The discovery shelf can be revealed without a Python rerun.
    if(strip)mutations?.observe(strip,{subtree:true,attributes:true,attributeFilter:["hidden"]})
    return()=>{resize?.disconnect();mutations?.disconnect();if(runtime.trackZoomFrame&&view){view.cancelAnimationFrame(runtime.trackZoomFrame);runtime.trackZoomFrame=null}}
  }
}

function readerMenu(id,label,content){
  return `<div class="desk-menu"><button type="button" class="desk-menu-trigger" data-reader-menu="${id}" aria-haspopup="dialog" aria-expanded="false">${label}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button><section class="desk-menu-panel" data-reader-menu-panel="${id}" role="dialog" aria-label="${label}" hidden>${content}</section></div>`
}
function readerMenuLabel(markup,label){return markup.replace('</button>',`<span class="desk-menu-label">${esc(label)}</span></button>`)}
function connectionViewControl(){
  return '<span class="desk-menu-heading">Connection lines</span><div role="group" aria-label="Connection lines"><button type="button" class="desk-tab" data-connection-view="flow" aria-pressed="true" title="Follow visible feeders and hide repeated direct lines">Through feeders</button><button type="button" class="desk-tab" data-connection-view="all" aria-pressed="false" title="Show every recorded connection, including direct links">All connections</button></div>'
}
function setupConnectionView(runtime,redraw){
  runtime.cleanupConnectionView?.()
  const root=runtime.root,view=root.ownerDocument.defaultView,key='care-connection-view-v1',eventName='care-connection-view-change'
  const read=()=>{try{const storage=view?.localStorage;return storage?storage.getItem(key)==='all'?'all':'flow':runtime.connectionView||'flow'}catch(_){return runtime.connectionView||'flow'}}
  const draw=()=>{if(runtime.queueThreads)runtime.queueThreads();else redraw?.()}
  runtime.connectionView=read()
  runtime.paintConnectionView=()=>{
    root.querySelectorAll('[data-connection-view]').forEach(button=>{const active=button.dataset.connectionView===runtime.connectionView;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})
  }
  const apply=mode=>{const next=mode==='all'?'all':'flow',changed=next!==runtime.connectionView;runtime.connectionView=next;runtime.paintConnectionView();if(changed)draw()}
  const change=event=>{if(event.detail?.mode==='all'||event.detail?.mode==='flow')apply(event.detail.mode)}
  const storage=event=>{if(event.key===key||event.key===null)apply(read())}
  const click=runtime.onClick
  runtime.onClick=event=>{
    const control=event.target?.closest?.('[data-connection-view]')
    if(!control)return click?.(event)
    event.preventDefault()
    const mode=control.dataset.connectionView
    if(mode!=='all'&&mode!=='flow')return
    apply(mode)
    try{view?.localStorage?.setItem(key,mode)}catch(_){}
    if(view?.CustomEvent)view.dispatchEvent(new view.CustomEvent(eventName,{detail:{mode}}))
  }
  runtime.attachConnectionView=()=>{view?.addEventListener(eventName,change);view?.addEventListener('storage',storage);apply(read())}
  runtime.cleanupConnectionView=()=>{view?.removeEventListener(eventName,change);view?.removeEventListener('storage',storage)}
}
function readerViewOptions({showZoom=true,showAppearance=true,showBeautifulText=true,shortcuts='book'}={}){
  const text='<span class="desk-menu-heading">Text size</span><div class="desk-text-size" aria-label="Reading text size"><button type="button" data-text-size="-1" aria-label="Make text smaller">A−</button><button type="button" data-text-size="1" aria-label="Make text larger">A+</button></div>'
  const zoom=showZoom?'<span class="desk-menu-heading">Pane zoom</span>'+trackZoomControls():''
  const appearance=showAppearance?'<span class="desk-menu-heading">Appearance</span><div class="desk-skin" aria-label="Visual skin"><button type="button" data-skin-value="care">CARE</button><button type="button" data-skin-value="library">BOOK</button><button type="button" data-skin-value="classic">CLASSIC</button></div>':''
  const rows=shortcuts==='lateral'?[['↑ / ↓','Previous or next axiom'],['Home / End','First or last visible axiom'],['Tab to Routes','Follow the selected axiom'],['[ / ]','Previous or next pane'],['Scroll sideways','Move between panes'],['Drag a pane edge','Resize a pane'],['− / + on a pane','Fold or unfold'],['Tab · Enter','Move to and use controls']]:[['↑ / ↓','Previous or next axiom'],['Home / End','First or last visible axiom'],['Tab to Routes','Follow the selected axiom'],['[ / ]','Previous or next pane'],['Scroll sideways','Move between panes'],['Drag a pane edge','Resize a pane']]
  return titleViewControl()+(showBeautifulText?beautifulTextControl():'')+connectionViewControl()+vibrantViewControl()+text+zoom+appearance+`<div class="desk-menu-rule"></div><button type="button" class="desk-tab" data-reader-shortcuts aria-expanded="false"><span>Shortcuts & controls</span><span class="desk-submenu-arrow" aria-hidden="true">⌨</span></button><div class="desk-shortcut-list" data-reader-shortcut-list hidden>${rows.map(([key,label])=>`<div><kbd>${esc(key)}</kbd><span>${esc(label)}</span></div>`).join('')}</div>`
}
function readerMenuBar(data,tabs,options={}){
  const book=options.file??(data?.corpus_sheet?'<span class="desk-menu-heading">Saved reading</span><span class="desk-sheet-version-slot" data-sheet-version-slot></span>':`<span class="desk-menu-heading">Book versions</span>${buildVersionControl(data)||'<span class="desk-menu-empty">Current reading</span>'}<div class="desk-menu-rule"></div>${readerMenuLabel(originalFormatControl(data),'Original reading format')}${readerMenuLabel(originalDownloadControl(data),'Download original')}<span class="desk-sheet-version-slot" data-sheet-version-slot></span>`)
  const navigate=options.navigate??`${readerMenuLabel(bookmarkControl(data),'Bookmarks')}<div class="desk-menu-rule"></div><button type="button" class="desk-tab" data-reader-layers aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="m3 6 7-3 7 3-7 3-7-3Zm0 4 7 3 7-3M3 14l7 3 7-3"/></svg><span>Reading layers</span><span class="desk-submenu-arrow" aria-hidden="true">›</span></button>`
  const thinkerRuns=data?.dialogue_runs?'<span class="desk-menu-heading">Dialogue thinkers</span><button type="button" class="desk-tab" data-dialogue-thinker-runs aria-haspopup="dialog"><span>Thinker comparisons…</span></button><div class="desk-menu-rule"></div>':''
  const connections=options.connections??thinkerRuns+connectionControls(data).replace(/(<button\b[^>]*aria-label="([^"]+)"[^>]*>)([\s\S]*?)(<\/button>)/g,(_,start,label,body,end)=>start+body+(body.includes('<svg')?`<span class="desk-menu-label">${label}</span>`:'')+end)+connectionResolutionControl(data)
  const portraitWork=String(data?.stack?.work?.id||data?.work?.id||'');
  const portraitViews=portraitWork?`<button type="button" class="desk-tab" data-portrait-open="book" data-portrait-work="${esc(portraitWork)}">Book portrait…</button><button type="button" class="desk-tab" data-portrait-open="author" data-portrait-work="${esc(portraitWork)}">Author’s library…</button><div class="desk-menu-rule"></div>`:'';
  const view=options.view??(`<span class="desk-menu-heading">Reading view</span>${data?.outline_available?outlineViewControl():'<span class="desk-menu-empty">Normal reading</span>'}`+readerViewOptions({...options,showZoom:options.showZoom??!(isRouteReference(data?.reference)||data?.connection?.reference)}))
  return `<div class="desk-reader-controls" role="group" aria-label="CARE reading menus">${readerMenu('book','File',book)}${readerMenu('navigate','Go',navigate)}${readerMenu('connections','Connections',connections||'<span class="desk-menu-empty">No connected readings available.</span>')}${readerMenu('view','View',portraitViews+view)}<section class="desk-menu-panel desk-layer-menu" data-reader-layers-panel role="dialog" aria-label="Reading layers" hidden>${connectionTabRail(tabs,data)}</section></div>`
}
function portraitMenuAction(runtime,event){
  const control=event.target.closest('[data-portrait-open]');if(!control)return false
  const kind=control.dataset.portraitOpen
  if(!['directory','book','author'].includes(kind))return false
  const work=String(control.dataset.portraitWork||control.closest('[data-connection-book]')?.dataset.connectionBook||runtime.data?.stack?.work?.id||'')
  if(kind!=='directory'&&!work)return false
  runtime.closeReaderMenu?.()
  runtime.api?.setTriggerValue('book_action',{action:kind==='directory'?'portrait_directory':kind==='author'?'author_library':'book_portrait',work_id:work,nonce:`${Date.now()}-${Math.random()}`})
  return true
}
function setupReaderMenus(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  // Existing popovers become cascading submenus when launched from this bar.
  for(const [method,key] of [['positionBuildVersionMenu','buildVersionMenu'],['positionSheetVersionMenu','sheetVersionPopover'],['positionBookmarkMenu','bookmarkMenu'],['positionOriginalFormats','originalFormatMenu'],['positionOriginalDownloads','originalDownloadMenu'],['positionConnectionDiscovery','discoveryPopover']]){
    const position=runtime[method];if(!position)continue
    runtime[method]=()=>{
      position();const popup=runtime[key],parent=popup?.anchor?.closest?.('.desk-menu-panel');if(!parent||parent.hidden)return
      const bounds=(runtime.readerMenuBoundsRoot||root).getBoundingClientRect(),panel=parent.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect()
      if(runtime.readerMenuBoundsRoot&&runtime.readerMenuBoundsRoot!==root){
        const width=Math.min(popup.element.offsetWidth,bounds.width-16),right=panel.right+6,left=panel.left-width-6,beside=right+width<=bounds.right-8?right:left>=bounds.left+8?left:null
        popup.element.style.maxHeight=Math.max(80,bounds.height-16)+'px'
        const top=Math.max(bounds.top+8,Math.min(beside===null?panel.bottom+6:anchor.top,bounds.bottom-popup.element.offsetHeight-8))
        Object.assign(popup.element.style,{position:'fixed',zIndex:'85',width:width+'px',left:(beside??Math.max(bounds.left+8,Math.min(panel.left,bounds.right-width-8)))+'px',top:top+'px',maxHeight:Math.max(80,bounds.bottom-top-8)+'px'});return
      }
      const scale=bounds.width/(root.offsetWidth||bounds.width)||1,width=popup.element.offsetWidth
      const right=(panel.right-bounds.left)/scale+6,left=(panel.left-bounds.left)/scale-width-6,room=bounds.width/scale
      const beside=right+width<=room-8?right:left>=8?left:null
      popup.element.style.maxHeight=Math.max(80,bounds.height/scale-16)+'px'
      const height=popup.element.offsetHeight
      const top=Math.max(8,Math.min((beside===null?panel.bottom:anchor.top)/scale-bounds.top/scale,bounds.height/scale-height-8))
      Object.assign(popup.element.style,{left:(beside??Math.max(8,Math.min((panel.left-bounds.left)/scale,room-width-8)))+'px',top:top+'px',maxHeight:Math.max(80,bounds.height/scale-top-8)+'px'})
    }
  }
  const buttons=()=>[...root.querySelectorAll('[data-reader-menu]')]
  const items=panel=>[...panel.querySelectorAll('button:not(:disabled),a[href],select:not(:disabled),input:not(:disabled)')].filter(el=>el.getClientRects().length)
  runtime.closeReaderLayers=({restoreFocus=false}={})=>{
    const layer=runtime.readerLayers;if(!layer)return
    runtime.readerLayers=null;layer.panel.hidden=true;layer.anchor.setAttribute('aria-expanded','false')
    if(restoreFocus&&layer.anchor.isConnected)layer.anchor.focus({preventScroll:true})
  }
  runtime.positionReaderLayers=()=>{
    const layer=runtime.readerLayers,menu=runtime.readerMenu;if(!layer||!menu)return
    const toolbar=menu.button.closest('.desk-menu-toolbar'),bounds=toolbar.getBoundingClientRect(),desk=(runtime.readerMenuBoundsRoot||root).getBoundingClientRect(),parent=menu.panel.getBoundingClientRect(),anchor=layer.anchor.getBoundingClientRect(),scale=bounds.width/(toolbar.offsetWidth||bounds.width)||1
    const width=layer.panel.offsetWidth,room=bounds.width/scale,right=(parent.right-bounds.left)/scale+5,left=(parent.left-bounds.left)/scale-width-5,beside=right+width<=room-8?right:left>=8?left:null
    layer.panel.style.maxHeight=Math.max(80,(desk.bottom-bounds.bottom-12)/scale)+'px'
    const top=Math.max((bounds.bottom-bounds.top)/scale-4,Math.min(((beside===null?parent.bottom:anchor.top)-bounds.top)/scale,(desk.bottom-bounds.top)/scale-layer.panel.offsetHeight-8))
    Object.assign(layer.panel.style,{left:(beside??Math.max(8,Math.min((parent.left-bounds.left)/scale,room-width-8)))+'px',top:top+'px'})
  }
  runtime.openReaderLayers=(anchor,{focus=false,last=false}={})=>{
    if(!runtime.readerMenu)return
    runtime.closeBookmarkMenu?.();runtime.closeReaderLayers()
    const panel=root.querySelector('[data-reader-layers-panel]');if(!panel)return
    runtime.readerLayers={anchor,panel};panel.hidden=false;anchor.setAttribute('aria-expanded','true');runtime.positionReaderLayers()
    if(focus){const choices=items(panel);(last?choices.at(-1):choices[0])?.focus({preventScroll:true})}
  }
  const childPopup=()=>runtime.buildVersionMenu||runtime.sheetVersionPopover||runtime.bookmarkMenu||runtime.originalFormatMenu||runtime.originalDownloadMenu||runtime.discoveryPopover||root.querySelector('.connection-resolution-panel')
  runtime.closeReaderMenu=({restoreFocus=false,children=true}={})=>{
    const menu=runtime.readerMenu;if(!menu)return
    runtime.closeReaderLayers()
    if(children){runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeBookmarkMenu?.();runtime.closeOriginalFormats?.();runtime.closeOriginalDownloads?.();runtime.closeConnectionDiscovery?.();runtime.closeConnectionResolution?.()}
    runtime.readerMenu=null;menu.panel.hidden=true;menu.button.setAttribute('aria-expanded','false')
    if(restoreFocus&&menu.button.isConnected)menu.button.focus({preventScroll:true})
  }
  runtime.positionReaderMenu=()=>{
    const menu=runtime.readerMenu;if(!menu)return
    const toolbar=menu.button.closest('.desk-menu-toolbar'),bounds=toolbar.getBoundingClientRect(),anchor=menu.button.getBoundingClientRect(),desk=(runtime.readerMenuBoundsRoot||root).getBoundingClientRect()
    const scale=bounds.width/(toolbar.offsetWidth||bounds.width)||1
    menu.panel.style.left=Math.max(8,Math.min((anchor.left-bounds.left)/scale,(bounds.width/scale)-menu.panel.offsetWidth-8))+'px'
    menu.panel.style.maxHeight=Math.max(80,(desk.bottom-bounds.bottom-12)/scale)+'px'
    runtime.positionReaderLayers()
  }
  runtime.openReaderMenu=(button,{focus=false,last=false}={})=>{
    runtime.closeReaderMenu()
    const panel=root.querySelector(`[data-reader-menu-panel="${button.dataset.readerMenu}"]`);if(!panel)return
    runtime.readerMenu={button,panel};panel.hidden=false;button.setAttribute('aria-expanded','true');runtime.positionReaderMenu()
    // These labels follow the current pane, including after a language change.
    panel.querySelectorAll('[data-sheet-version-menu]').forEach(el=>{if(!el.querySelector('.desk-menu-label'))el.insertAdjacentHTML('beforeend','<span class="desk-menu-label">Language & translation</span>')})
    if(focus){const choices=items(panel);(last?choices.at(-1):choices[0])?.focus({preventScroll:true})}
  }
  const click=event=>{
    const shortcuts=event.target.closest?.('[data-reader-shortcuts]')
    if(shortcuts){const list=shortcuts.parentElement.querySelector('[data-reader-shortcut-list]');if(list){list.hidden=!list.hidden;shortcuts.setAttribute('aria-expanded',String(!list.hidden));runtime.positionReaderMenu()}return}
    const layers=event.target.closest?.('[data-reader-layers]')
    if(layers){if(runtime.readerLayers?.hoverOpened){runtime.readerLayers.hoverOpened=false;return}if(runtime.readerLayers)runtime.closeReaderLayers();else runtime.openReaderLayers(layers);return}
    const trigger=event.target.closest?.('[data-reader-menu]')
    if(trigger){const same=runtime.readerMenu?.button===trigger;if(same&&runtime.readerMenu.hoverOpened){runtime.readerMenu.hoverOpened=false;return}runtime.closeReaderMenu();if(!same)runtime.openReaderMenu(trigger);return}
    if(event.target.closest?.('.desk-menu-panel')&&event.target.closest?.('[data-pane-target],[data-reader-view],[data-discovery-explore],[data-connection-close],[data-connection-clear]'))runtime.closeReaderMenu({restoreFocus:true})
  }
  const hover=event=>{
    const button=event.target.closest?.('[data-reader-menu]');if(runtime.readerMenu&&button&&button!==runtime.readerMenu.button){runtime.openReaderMenu(button);runtime.readerMenu.hoverOpened=true;return}
    const layers=event.target.closest?.('[data-reader-layers]');if(layers&&runtime.readerMenu&&!runtime.readerLayers){runtime.openReaderLayers(layers);runtime.readerLayers.hoverOpened=true;return}
    if(runtime.readerLayers&&runtime.readerMenu.panel.contains(event.target)&&!runtime.readerLayers.anchor.contains(event.target))runtime.closeReaderLayers()
  }
  const onKey=runtime.onKey
  runtime.onKey=event=>{
    const trigger=event.target.closest?.('[data-reader-menu]'),menu=runtime.readerMenu,inLayers=runtime.readerLayers?.panel.contains(event.target),inPanel=menu?.panel.contains(event.target)||inLayers
    if(!trigger&&!inPanel)return onKey(event)
    // An existing child popover owns its keyboard and restores its own anchor.
    if(childPopup()&&!trigger)return onKey(event)
    if(inLayers&&['Escape','ArrowLeft'].includes(event.key)){event.preventDefault();event.stopPropagation();runtime.closeReaderLayers({restoreFocus:true});return}
    const layerTrigger=event.target.closest?.('[data-reader-layers]')
    if(layerTrigger&&['ArrowRight','Enter',' '].includes(event.key)){event.preventDefault();runtime.openReaderLayers(layerTrigger,{focus:true});return}
    if(inLayers&&event.key==='ArrowRight'){event.preventDefault();return}
    const headings=buttons(),button=trigger||menu?.button,index=headings.indexOf(button)
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();runtime.closeReaderMenu({restoreFocus:true});return}
    if(event.key==='Tab'){if(menu&&!inPanel)runtime.closeReaderMenu();return}
    if(event.target.matches?.('select,input,textarea'))return
    if(event.key==='ArrowRight'&&inPanel&&event.target.matches?.('[aria-haspopup]')){event.preventDefault();event.target.click();return}
    if(['ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();const next=headings[(index+(event.key==='ArrowRight'?1:-1)+headings.length)%headings.length];next?.focus({preventScroll:true});if(menu)runtime.openReaderMenu(next,{focus:inPanel});return
    }
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();if(trigger){runtime.openReaderMenu(trigger,{focus:true,last:event.key==='ArrowUp'||event.key==='End'});return}
      const choices=items(inLayers?runtime.readerLayers.panel:menu.panel),current=choices.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?choices.length-1:(current+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length
      choices[next]?.focus({preventScroll:true});return
    }
    // Do not let reading shortcuts act while operating a menu.
  }
  const outside=event=>{
    if(!runtime.readerMenu)return
    const path=event.composedPath?.()||[],target=path[0]||event.target,menu=runtime.readerMenu
    if(path.includes(menu.panel)||path.includes(menu.button)||menu.panel.contains(target)||menu.button.contains(target))return
    if(runtime.readerLayers&&(path.includes(runtime.readerLayers.panel)||runtime.readerLayers.panel.contains(target)))return
    // Child popovers are siblings under the component root, not descendants.
    if(target?.closest?.('.build-version-menu,.pane-bookmark-menu,.connection-discovery-popover,.connection-resolution-panel'))return
    runtime.closeReaderMenu()
  }
  const wheel=event=>{if(runtime.readerMenu?.panel.contains(event.target))event.stopPropagation()}
  runtime.attachReaderMenus=()=>{root.addEventListener('click',click);root.addEventListener('pointerover',hover);doc.addEventListener('pointerdown',outside,true);doc.addEventListener('focusin',outside,true);view?.addEventListener('resize',runtime.positionReaderMenu);root.addEventListener('wheel',wheel,true)}
  runtime.restoreReaderMenu=()=>{const saved=runtime.readerMenuRestore;runtime.readerMenuRestore=null;if(saved&&saved.workId===String(runtime.data?.stack?.work?.id||'')){const button=root.querySelector(`[data-reader-menu="${saved.id}"]`);if(button){runtime.openReaderMenu(button);if(saved.layers){const anchor=root.querySelector('[data-reader-layers]');if(anchor)runtime.openReaderLayers(anchor)}}}}
  runtime.cleanupReaderMenus=()=>{runtime.readerMenuRestore=runtime.readerMenu?{id:runtime.readerMenu.button.dataset.readerMenu,workId:String(runtime.data?.stack?.work?.id||''),layers:Boolean(runtime.readerLayers)}:null;runtime.closeReaderMenu({children:false});root.removeEventListener('click',click);root.removeEventListener('pointerover',hover);doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('focusin',outside,true);view?.removeEventListener('resize',runtime.positionReaderMenu);root.removeEventListener('wheel',wheel,true)}
}

function paneTab(id,label){return `<button type="button" class="desk-tab" data-pane-target="${esc(id)}">${esc(label)}</button>`}
const buildVersionName=option=>option?.version_number?`Version ${option.version_number}`:String(option?.version_label||option?.label||"Version").split(" · ")[0]
function buildVersionControl(data){
  const options=arr(data?.build_versions),selected=String(data?.selected_build_id||data?.stack?.work?.id||"")
  if(!options.length)return ""
  const current=options.find(option=>String(option.work_id||option.id)===selected)
  return `<button type="button" class="desk-tab desk-build-version" data-build-version-menu aria-label="Book versions · ${esc(buildVersionName(current))}" title="Choose book version" aria-haspopup="menu" aria-expanded="false"><span>${esc(buildVersionName(current))}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button>`
}
function buildVersionMenu(data){
  const options=[...arr(data?.build_versions)].sort((a,b)=>Number(b.version_number||0)-Number(a.version_number||0)),selected=String(data?.selected_build_id||data?.stack?.work?.id||"")
  const latest=options.find(option=>option.available!==false&&!option.archived)
  const date=option=>{const value=option.added_at||option.run_at;if(!value)return "";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?"":new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(parsed)}
  return `<strong class="build-version-menu-head">Book versions</strong><div class="build-version-options" role="menu" aria-label="Book versions">${options.map(option=>{
    const id=String(option.work_id||option.id||""),chosen=id===selected,detail=[option.available===false?"Not ready to read":option.archived?"Archived":option===latest?"Latest version":"Earlier version",date(option)].filter(Boolean).join(" · ")
    return `<button type="button" class="build-version-option" role="menuitemradio" data-build-version-choice="${esc(id)}" aria-checked="${chosen}"${option.available===false?" disabled":""}><span class="build-version-copy"><strong>${esc(buildVersionName(option))}</strong><small>${esc(detail)}</small></span><span class="build-version-check" aria-hidden="true">${chosen?"✓":""}</span></button>`
  }).join("")}</div>`
}
function setupBuildVersionMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeBuildVersionMenu=({restoreFocus=false}={})=>{const popup=runtime.buildVersionMenu;if(!popup)return;runtime.buildVersionMenu=null;popup.anchor.setAttribute("aria-expanded","false");popup.element.remove();if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})}
  runtime.positionBuildVersionMenu=()=>{
    const popup=runtime.buildVersionMenu;if(!popup)return
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),width=Math.min(304,bounds.width-16),top=Math.max(8,Math.min(bounds.height-120,anchor.bottom-bounds.top+8))
    Object.assign(popup.element.style,{width:width+"px",left:Math.max(8,Math.min(bounds.width-width-8,anchor.right-bounds.left-width))+"px",top:top+"px",maxHeight:Math.max(80,bounds.height-top-8)+"px"})
  }
  runtime.openBuildVersionMenu=anchor=>{
    const same=runtime.buildVersionMenu?.anchor===anchor
    runtime.closeBuildVersionMenu();if(same)return
    runtime.closeConnectionDiscovery?.();runtime.closeSheetVersionMenu?.()
    const element=doc.createElement("section");element.className="build-version-menu";element.innerHTML=buildVersionMenu(runtime.data)
    root.append(element);runtime.buildVersionMenu={anchor,element};anchor.setAttribute("aria-expanded","true");runtime.positionBuildVersionMenu()
    ;(element.querySelector('[aria-checked="true"]:not(:disabled)')||element.querySelector("[data-build-version-choice]:not(:disabled)"))?.focus({preventScroll:true})
  }
  runtime.onBuildVersionClick=event=>{
    const trigger=event.target?.closest?.("[data-build-version-menu]")
    if(trigger){event.preventDefault();runtime.openBuildVersionMenu(trigger);return}
    const choice=event.target?.closest?.("[data-build-version-choice]")
    if(!choice||choice.disabled||!runtime.buildVersionMenu?.element.contains(choice))return
    event.preventDefault();runtime.chooseBuildVersion(choice.dataset.buildVersionChoice);runtime.closeBuildVersionMenu({restoreFocus:true})
  }
  const onKey=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.buildVersionMenu,trigger=event.target?.closest?.("[data-build-version-menu]")
    if(!popup&&trigger&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();runtime.openBuildVersionMenu(trigger);return}
    if(!popup)return onKey(event)
    event.stopPropagation?.()
    if(event.key==="Escape"){event.preventDefault();runtime.closeBuildVersionMenu({restoreFocus:true});return}
    if(event.key==="Tab"){runtime.closeBuildVersionMenu({restoreFocus:true});return}
    const choices=[...popup.element.querySelectorAll("[data-build-version-choice]:not(:disabled)")],index=choices.indexOf(event.target)
    if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
      event.preventDefault();const next=event.key==="Home"?0:event.key==="End"?choices.length-1:(index+(event.key==="ArrowDown"?1:-1)+choices.length)%choices.length
      choices[next]?.focus({preventScroll:true});choices[next]?.scrollIntoView?.({block:"nearest"});return
    }
    // Native buttons handle Enter and Space; reader shortcuts stay in the reader.
  }
  const outside=event=>{const popup=runtime.buildVersionMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeBuildVersionMenu()}
  runtime.attachBuildVersionMenu=()=>{root.addEventListener("click",runtime.onBuildVersionClick);doc.addEventListener("pointerdown",outside,true);view?.addEventListener("resize",runtime.positionBuildVersionMenu);root.addEventListener("scroll",runtime.positionBuildVersionMenu,true)}
  runtime.cleanupBuildVersionMenu=()=>{runtime.closeBuildVersionMenu();root.removeEventListener("click",runtime.onBuildVersionClick);doc.removeEventListener("pointerdown",outside,true);view?.removeEventListener("resize",runtime.positionBuildVersionMenu);root.removeEventListener("scroll",runtime.positionBuildVersionMenu,true)}
}

const bookmarkIcon=()=>'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.25h10v14l-5-3.5-5 3.5z"/></svg>'
const bookmarkLayers=new Set(["CH","CL","MC","WB"])
const fieldBookmarkLayers=new Set(["CB","XR","XS","SC","XA"])
const bookmarkLayerAllowed=(layer,field=false)=>bookmarkLayers.has(String(layer).toUpperCase())||(field&&fieldBookmarkLayers.has(String(layer).toUpperCase()))
function bookBookmarks(data){
  const work=String(data?.stack?.work?.id||""),seen=new Set()
  return arr(data?.bookmarks).filter(row=>{const id=String(row.care_unit_id||"");if(!id||seen.has(id)||(row.work_id&&String(row.work_id)!==work))return false;seen.add(id);return true}).sort((a,b)=>String(b.saved_at||"").localeCompare(String(a.saved_at||"")))
}
function bookmarkablePane(data,focused){
  if(isRouteReference(data?.reference)||data?.connection?.reference)return null
  return arr(data?.stack?.care_path).find(unit=>String(unit.id)===String(focused)&&bookmarkLayerAllowed(unit.type,data?.corpus_sheet))||null
}
function paneBookmarkButton(unit,bookmarks=[],field=false){
  if(!bookmarkLayerAllowed(unit.type,field))return ""
  const active=arr(bookmarks).some(row=>String(row.care_unit_id)===String(unit.id)),title=unit.identity?.title||unit.title||unit.id,label=`${active?"Remove bookmark for":"Bookmark"} ${readerLayerLabel(unit.type,unit)} · ${title}`
  return `<button type="button" class="pane-bookmark" data-bookmark-toggle="${esc(unit.id)}" aria-pressed="${active}" aria-label="${esc(label)}" title="${esc(label)}">${bookmarkIcon()}</button>`
}
function bookmarkControl(data){
  if(!data?.stack?.work?.id)return ""
  const count=bookBookmarks(data).length
  return `<button type="button" class="desk-tab desk-bookmark-control" data-bookmark-menu aria-label="Bookmarks in this book${count?` · ${count}`:""}" title="Bookmarks in this book" aria-haspopup="dialog" aria-expanded="false">${bookmarkIcon()}${count?`<small aria-hidden="true">${count}</small>`:""}</button>`
}
function bookmarkMenu(data,focused){
  const bookmarks=bookBookmarks(data),unit=bookmarkablePane(data,focused),active=unit&&bookmarks.some(row=>String(row.care_unit_id)===String(unit.id))
  const current=unit?`<button type="button" class="pane-bookmark-current" data-bookmark-toggle="${esc(unit.id)}" aria-pressed="${Boolean(active)}">${bookmarkIcon()}<span><strong>${active?"Remove this bookmark":"Bookmark this pane"}</strong><small>${esc(readerLayerLabel(unit.type,unit))} · ${esc(unit.identity?.title||unit.title||unit.id)}</small></span></button>`:""
  const savedDate=value=>{const date=new Date(value);return value&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short"}).format(date):""}
  const rows=bookmarks.map(row=>`<button type="button" class="pane-bookmark-row" data-bookmark-open="${esc(row.care_unit_id)}"${row.available===false?` disabled aria-label="${esc(row.title||row.care_unit_id)} · Currently unavailable"`:""}><span class="pane-bookmark-layer" style="--bookmark-accent:${layerColor(row.layer,row)}">${esc(readerLayerLabel(row.layer,row)||"CARE")}</span><span class="pane-bookmark-copy"><strong>${esc(row.title||row.care_unit_id)}</strong><small>${esc(row.available===false?"Currently unavailable":[row.layer?`${readerLayerLabel(row.layer,row)} pane`:"Saved pane",savedDate(row.saved_at)].filter(Boolean).join(" · "))}</small></span></button>`).join("")
  return `<div class="pane-bookmark-heading"><div><strong>Bookmarks in this book</strong><small>${esc(data?.stack?.work?.title||"Your reading")}</small></div><button type="button" data-bookmark-close aria-label="Close bookmarks">×</button></div>${current}${rows?`<div class="pane-bookmark-list" role="group" aria-label="Saved panes">${rows}</div>`:`<div class="pane-bookmark-empty">${bookmarkIcon()}<strong>Keep a place worth returning to</strong><p>Bookmark a CH, CL, MC or WB pane to find it here.</p></div>`}${unit?"":'<p class="pane-bookmark-footnote">Choose a CARE pane to bookmark it.</p>'}`
}

const etchedRouteIcon=()=>'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v4c0 3 8 1 8 5v3M6 8v8"/><circle cx="6" cy="3" r="1.4"/><circle cx="6" cy="17" r="1.4"/><circle cx="14" cy="17" r="1.4"/></svg><span class="reader-action-tip" aria-hidden="true">Routes</span>'
function bookmarkableAxioms(data){
  const targets=new Map(),work=String(data?.stack?.work?.id||"")
  if(!work)return targets
  const add=(item,unitId,layer)=>{
    const id=String(item?.id||"")
    if(id&&unitId&&item?.resolved!==false&&(!item.kind||item.kind==="axiom")&&bookmarkLayerAllowed(layer||item.layer,data?.corpus_sheet)&&(!item.work_id||String(item.work_id)===work||data?.corpus_sheet))targets.set(id,{care_item_id:id,unit_id:String(unitId),work_id:work})
  }
  for(const unit of [...arr(data?.stack?.care_path),...arr(data?.outline_units).map(row=>row.unit).filter(Boolean)])for(const item of [...arr(unit.items),...arr(unit.sections).flatMap(section=>arr(section.items))])add(item,unit.id,unit.type)
  const reference=data?.reference
  if(reference){add(reference,reference.unit_id,reference.layer);for(const rows of Object.values(reference.route_layers||{}))for(const item of arr(rows))add(item,item.unit_id,item.layer)}
  return targets
}
function decorateReadingActions(runtime){
  const root=runtime.root,targets=bookmarkableAxioms(runtime.data),favourites=new Set(arr(runtime.data?.favourite_axiom_ids).map(String))
  root.querySelectorAll("[data-open-axiom-routes],[data-open-passage-routes]").forEach(button=>{
    if(!button.classList.contains("reader-route-action")){button.classList.add("reader-route-action");button.innerHTML=etchedRouteIcon()}
  })
  root.querySelectorAll("[data-select-axiom]").forEach(axiom=>{
    if(axiom.closest("[data-connection-book],[data-connection-field]"))return
    const id=String(axiom.dataset.selectAxiom||""),target=targets.get(id),row=axiom.closest(".axiom-row")
    if(!row||!target)return
    const active=favourites.has(id),label=`${active?"Remove saved axiom":"Save axiom"} · ${id}`
    let button=row.querySelector("[data-favourite-axiom]")
    if(!button){button=root.ownerDocument.createElement("button");button.type="button";button.classList.add("reader-axiom-mark");button.setAttribute("data-favourite-axiom",id);button.innerHTML=bookmarkIcon();row.append(button)}
    button.setAttribute("aria-pressed",String(active));button.setAttribute("aria-label",label);button.title=label
    row.classList.add("reader-has-mark");row.classList.toggle("reader-axiom-saved",active)
  })
}
function setupAxiomFavourites(runtime){
  runtime.toggleAxiomFavourite=id=>{
    const care_item_id=String(id||""),target=bookmarkableAxioms(runtime.data).get(care_item_id)
    if(!target)return
    runtime.api?.setTriggerValue("axiom_favourite_action",{care_item_id,work_id:target.work_id,active:!arr(runtime.data?.favourite_axiom_ids).map(String).includes(care_item_id),token:`${Date.now()}-${Math.random().toString(36).slice(2)}`})
  }
  const click=runtime.onClick;runtime.onClick=event=>{
    const button=event.target?.closest?.("[data-favourite-axiom]")
    if(button){event.preventDefault();event.stopPropagation?.();if(!button.disabled&&!button.closest("[data-connection-book],[data-connection-field]"))runtime.toggleAxiomFavourite(button.dataset.favouriteAxiom);return}
    return click(event)
  }
}

function applySavedPaneFocus(runtime){
  const request=runtime.data?.saved_focus,token=String(request?.token||""),unitId=String(request?.unit_id||"")
  if(!token||runtime.savedFocusToken===token||String(request?.work_id||"")!==String(runtime.data?.stack?.work?.id||"")||!bookmarkablePane(runtime.data,unitId))return false
  const pane=runtime.root.querySelector(`[data-pane="${CSS.escape(unitId)}"]`),strip=runtime.root.querySelector("[data-strip]")
  // Do not consume a request before the reader has a measurable destination.
  // Its first ResizeObserver delivery retries after the workspace lays out.
  if(!pane||!strip?.clientWidth||!pane.getBoundingClientRect().width)return false
  if(pane.classList?.contains("care-pane-minimized"))pane.querySelector('[data-pane-control="minimize"]')?.click()
  runtime.savedFocusToken=token
  runtime.focus(unitId)
  return true
}
function setupPaneBookmarks(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeBookmarkMenu=({restoreFocus=false}={})=>{runtime.bookmarkMenuRestore=null;const popup=runtime.bookmarkMenu;if(!popup)return;runtime.bookmarkMenu=null;popup.anchor.setAttribute("aria-expanded","false");popup.element.remove();if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})}
  runtime.positionBookmarkMenu=()=>{
    const popup=runtime.bookmarkMenu;if(!popup)return
    const bounds=root.getBoundingClientRect(),scale=readerLayoutScale(root,bounds),anchor=popup.anchor.getBoundingClientRect(),rootWidth=bounds.width/scale,rootHeight=bounds.height/scale,width=Math.max(0,Math.min(360,rootWidth-16)),top=Math.max(8,Math.min(rootHeight-160,(anchor.bottom-bounds.top)/scale+8))
    Object.assign(popup.element.style,{width:width+"px",left:Math.max(8,Math.min(rootWidth-width-8,(anchor.right-bounds.left)/scale-width))+"px",top:top+"px",maxHeight:Math.max(80,rootHeight-top-8)+"px"})
  }
  runtime.openBookmarkMenu=(anchor,{restore=false}={})=>{
    if(!anchor||!runtime.data?.stack?.work?.id)return
    runtime.closeReaderLayers?.()
    const same=runtime.bookmarkMenu?.anchor===anchor;runtime.closeBookmarkMenu();if(same&&!restore)return
    runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement("section");element.className="build-version-menu pane-bookmark-menu";element.setAttribute("role","dialog");element.setAttribute("aria-label","Bookmarks in this book");element.innerHTML=bookmarkMenu(runtime.data,runtime.focused)
    root.append(element);runtime.bookmarkMenu={anchor,element,workId:String(runtime.data.stack.work.id)};anchor.setAttribute("aria-expanded","true");runtime.positionBookmarkMenu()
    if(!restore)(element.querySelector('[data-bookmark-toggle],[data-bookmark-open]:not(:disabled)')||element.querySelector("[data-bookmark-close]"))?.focus({preventScroll:true})
  }
  runtime.emitBookmarkAction=(action,id)=>{
    const care_unit_id=String(id||""),work_id=String(runtime.data?.stack?.work?.id||""),saved=bookBookmarks(runtime.data),row=saved.find(row=>String(row.care_unit_id)===care_unit_id)
    if(!care_unit_id||!work_id)return
    if(action==="toggle"&&!bookmarkablePane(runtime.data,care_unit_id))return
    if(action==="open"&&(!row||row.available===false))return
    if(!["toggle","open"].includes(action))return
    if(action==="open")runtime.closeBookmarkMenu()
    runtime.api?.setTriggerValue("bookmark_action",{action,care_unit_id,work_id,...(action==="toggle"?{active:!row}:{}),token:`${Date.now()}-${Math.random().toString(36).slice(2)}`})
  }
  const click=runtime.onClick;runtime.onClick=event=>{
    const anchor=event.target?.closest?.("[data-bookmark-menu]")
    if(anchor){event.preventDefault();runtime.openBookmarkMenu(anchor);return}
    const toggle=event.target?.closest?.("[data-bookmark-toggle]")
    if(toggle){event.preventDefault();event.stopPropagation?.();runtime.emitBookmarkAction("toggle",toggle.dataset.bookmarkToggle);return}
    const open=event.target?.closest?.("[data-bookmark-open]")
    if(open){event.preventDefault();if(!open.disabled)runtime.emitBookmarkAction("open",open.dataset.bookmarkOpen);return}
    if(event.target?.closest?.("[data-bookmark-close]")){event.preventDefault();runtime.closeBookmarkMenu({restoreFocus:true});return}
    return click(event)
  }
  const key=runtime.onKey;runtime.onKey=event=>{
    const anchor=event.target?.closest?.("[data-bookmark-menu]"),popup=runtime.bookmarkMenu
    if(!popup&&anchor&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();runtime.openBookmarkMenu(anchor);return}
    if(!popup||(!popup.element.contains(event.target)&&!anchor))return key(event)
    event.stopPropagation?.()
    if(event.key==="Escape"){event.preventDefault();runtime.closeBookmarkMenu({restoreFocus:true});return}
    if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
      event.preventDefault();const choices=[...popup.element.querySelectorAll("button:not(:disabled)")],index=choices.indexOf(event.target),next=event.key==="Home"?0:event.key==="End"?choices.length-1:(index+(event.key==="ArrowDown"?1:-1)+choices.length)%choices.length
      choices[next]?.focus({preventScroll:true});choices[next]?.scrollIntoView?.({block:"nearest"})
    }
    // Native buttons handle Enter/Space; Tab leaves this nonmodal popup normally.
  }
  const outside=event=>{const popup=runtime.bookmarkMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeBookmarkMenu()}
  const wheel=runtime.onWheel;runtime.onWheel=event=>{if(event.target?.closest?.(".pane-bookmark-menu"))return;return wheel?.(event)}
  runtime.attachPaneBookmarks=()=>{doc.addEventListener("pointerdown",outside,true);doc.addEventListener("focusin",outside,true);view?.addEventListener("resize",runtime.positionBookmarkMenu);root.addEventListener("scroll",runtime.positionBookmarkMenu,true)}
  runtime.cleanupPaneBookmarks=()=>{const saved=runtime.bookmarkMenu?.workId;runtime.closeBookmarkMenu();runtime.bookmarkMenuRestore=saved||null;doc.removeEventListener("pointerdown",outside,true);doc.removeEventListener("focusin",outside,true);view?.removeEventListener("resize",runtime.positionBookmarkMenu);root.removeEventListener("scroll",runtime.positionBookmarkMenu,true)}
}

function activeTranslationSheet(data,focused){
  if(isRouteReference(data?.reference))return null
  const chapter=data?.stack?.active_chapter
  if(focused==="source"&&chapter?.source_versions&&arr(chapter.source_versions.options).length)return sourceTranslationSheet(chapter)
  const unit=arr(data?.stack?.care_path).find(row=>String(row.id)===String(focused))
  if(!unit||!["CH","CL","MC","WB"].includes(String(unit.type).toUpperCase()))return null
  const versions=unit.sheet_versions
  return versions&&arr(versions.options).length?unit:null
}
function sourceTranslationSheet(chapter){return {id:chapter.raw_unit_id,type:"SOURCE",title:chapter.title,sheet_versions:chapter.source_versions}}
function sheetVersionTrigger(unit,{pane=false}={}){
  if(!unit?.sheet_versions||!arr(unit.sheet_versions.options).length)return ""
  const versions=unit.sheet_versions,current=arr(versions.options).find(option=>String(option.id)===String(versions.selected_id))
  const languages=new Set(arr(versions.options).filter(option=>option.available!==false).map(option=>String(option.language_code||"").toLowerCase()).filter(Boolean))
  if(pane&&languages.size<2)return ""
  const label='Language & translation · '+(unit.identity?.title||unit.title||unit.id),code=String(current?.language_code||"").toUpperCase()
  const content=pane?`${esc(code)}<span aria-hidden="true">⌄</span>`:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h12M9 3v2M5 5c1 6 5 9 9 11M13 5c-1 6-5 9-10 12M14 21l4-10 4 10M15.5 17h5"/></svg>'
  return `<button type="button" class="${pane?'pane-language':'desk-tab desk-sheet-version'}" data-sheet-version-menu="${esc(unit.id)}" aria-haspopup="dialog" aria-expanded="false" aria-label="${esc(label)}" title="${esc(label)}">${content}</button>`
}
function sheetVersionControl(unit,stack,{canTranslateBook=false}={}){
  const versions=unit.sheet_versions
  if(!versions||!arr(versions.options).length)return ""
  const selected=String(versions.selected_id||""),languages=arr(versions.language_options),disabled=versions.translating||versions.can_translate===false||!languages.length
  const sourceControls=unit.type==="SOURCE"?`<div class="sheet-version-fields"><button type="button" data-edit-source="${esc(unit.id)}">Edit source &amp; passage size…</button><small>Preview one chapter or the whole book before saving a new source layer.</small></div>`:""
  const bookControls=canTranslateBook?`<div class="sheet-version-fields"><strong>Whole book</strong><button type="button" data-translate-book-scope="care">Translate all CARE panes…</button><button type="button" data-translate-book-scope="source">Translate all source text…</button><button type="button" data-translate-book-scope="both">Translate CARE panes and source text…</button></div>`:""
  return `<div class="sheet-versions" data-sheet-versions="${esc(unit.id)}" data-version-work="${esc(stack?.work?.id||"")}"><div class="sheet-version-heading"><div><strong>Language &amp; translation</strong><small>${esc(unit.type+' · '+(unit.identity?.title||unit.title||unit.id))}</small></div><button type="button" data-sheet-version-close aria-label="Close translations">×</button></div><div class="sheet-version-fields"><label>Read in<select data-sheet-version aria-label="Saved language for ${esc(unit.identity?.title||unit.title||unit.id)}">${arr(versions.options).map(option=>`<option value="${esc(option.id)}"${String(option.id)===selected?" selected":""}${option.available===false?" disabled":""}>${esc(option.label||option.id)}</option>`).join("")}</select></label><div class="sheet-translation-row"><label>Translate into<select data-translation-language aria-label="Translation language for ${esc(unit.identity?.title||unit.title||unit.id)}"${disabled?" disabled":""}>${languages.map(option=>`<option value="${esc(option.code)}"${String(option.code)===String(versions.default_language_code)?" selected":""}>${esc(option.label||option.code)}</option>`).join("")}</select></label><button type="button" data-translate-sheet${disabled?" disabled":""}>${versions.translating?"Translating…":"Translate pane"}</button></div><small>${esc(versions.message||versions.status||"Creates a saved machine translation of this CARE sheet. The original and every reference remain available. Machine translation needs review.")}</small></div>${sourceControls}${bookControls}</div>`
}
function setupSheetVersionMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeSheetVersionMenu=({restoreFocus=false}={})=>{const popup=runtime.sheetVersionPopover;if(!popup)return;runtime.sheetVersionPopover=null;popup.anchor.setAttribute("aria-expanded","false");popup.element.remove();if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})}
  runtime.positionSheetVersionMenu=()=>{
    const popup=runtime.sheetVersionPopover;if(!popup)return
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),width=Math.max(0,Math.min(360,bounds.width-16)),top=Math.max(8,Math.min(bounds.height-160,anchor.bottom-bounds.top+8))
    Object.assign(popup.element.style,{width:width+"px",left:Math.max(8,Math.min(bounds.width-width-8,anchor.right-bounds.left-width))+"px",top:top+"px",maxHeight:Math.max(80,bounds.height-top-8)+"px"})
  }
  runtime.openSheetVersionMenu=(anchor,{restore=false}={})=>{
    const unit=activeTranslationSheet(runtime.data,runtime.focused)
    if(!unit||String(unit.id)!==anchor?.dataset.sheetVersionMenu)return
    const same=runtime.sheetVersionPopover?.anchor===anchor;runtime.closeSheetVersionMenu();if(same&&!restore)return
    runtime.closeBuildVersionMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement("section");element.className="build-version-menu sheet-version-popover";element.setAttribute("role","dialog");element.setAttribute("aria-label",`Language & translation · ${unit.identity?.title||unit.title||unit.id}`);element.innerHTML=sheetVersionControl(unit,runtime.data.stack,{canTranslateBook:runtime.data.book_translation_available})
    root.append(element);runtime.sheetVersionPopover={anchor,element,id:String(unit.id),workId:String(runtime.data.stack.work.id)};anchor.setAttribute("aria-expanded","true");runtime.positionSheetVersionMenu()
    if(!restore)element.querySelector("[data-sheet-version]")?.focus({preventScroll:true})
  }
  runtime.paintSheetVersionControl=()=>{
    const slot=root.querySelector("[data-sheet-version-slot]");if(!slot)return
    const unit=activeTranslationSheet(runtime.data,runtime.focused),markup=sheetVersionTrigger(unit)
    if(runtime.sheetVersionPopover&&(runtime.sheetVersionPopover.id!==String(unit?.id)||runtime.sheetVersionPopover.workId!==String(runtime.data?.stack?.work?.id)))runtime.closeSheetVersionMenu()
    if(slot.innerHTML!==markup&&!runtime.sheetVersionPopover)slot.innerHTML=markup
    const saved=runtime.pendingSheetVersionMenu;runtime.pendingSheetVersionMenu=null
    if(saved&&unit&&saved.id===String(unit.id)&&saved.workId===String(runtime.data.stack.work.id)){
      const anchor=slot.querySelector("[data-sheet-version-menu]");runtime.openSheetVersionMenu(anchor,{restore:true})
      const popup=runtime.sheetVersionPopover?.element,input=popup?.querySelector("[data-translation-language]")
      if(input&&[...input.options].some(option=>option.value===saved.language))input.value=saved.language
      if(saved.focus)popup?.querySelector(saved.focus)?.focus({preventScroll:true})
    }
  }
  const paintFocus=runtime.paintFocus;runtime.paintFocus=()=>{paintFocus();runtime.paintSheetVersionControl()}
  runtime.captureVersionMenus=()=>{const popup=runtime.sheetVersionPopover,saved=runtime.savedSheetVersionMenu;runtime.savedSheetVersionMenu=null;if(!popup)return saved?[saved]:[];const menu=popup.element,focused=menu.querySelector(":focus");return [{id:popup.id,workId:popup.workId,language:menu.querySelector("[data-translation-language]")?.value,focus:["[data-sheet-version]","[data-translation-language]","[data-translate-sheet]"].find(selector=>focused?.matches(selector))||null}]}
  runtime.restoreVersionMenus=states=>{runtime.pendingSheetVersionMenu=states[0]||null}
  runtime.onSheetPaneFocus=event=>{const pane=event.target?.closest?.("[data-pane]");if(pane&&pane.dataset.pane!==runtime.focused){runtime.focused=pane.dataset.pane;runtime.paintFocus()}}
  const onClick=runtime.onClick;runtime.onClick=event=>{
    runtime.onSheetPaneFocus(event)
    const anchor=event.target?.closest?.("[data-sheet-version-menu]")
    if(anchor){event.preventDefault();runtime.openSheetVersionMenu(anchor);return}
    if(event.target?.closest?.("[data-sheet-version-close]")){event.preventDefault();runtime.closeSheetVersionMenu({restoreFocus:true});return}
    return onClick(event)
  }
  const onKey=runtime.onKey;runtime.onKey=event=>{
    if(runtime.sheetVersionPopover&&event.key==="Escape"){event.preventDefault();event.stopPropagation();runtime.closeSheetVersionMenu({restoreFocus:true});return}
    if(event.target?.closest?.("[data-sheet-versions]")){event.stopPropagation?.();return}
    return onKey(event)
  }
  const outside=event=>{const popup=runtime.sheetVersionPopover,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeSheetVersionMenu()}
  runtime.attachSheetVersionMenu=()=>{doc.addEventListener("pointerdown",outside,true);view?.addEventListener("resize",runtime.positionSheetVersionMenu);root.addEventListener("scroll",runtime.positionSheetVersionMenu,true);for(const event of ["pointerdown","focusin","wheel"])root.addEventListener(event,runtime.onSheetPaneFocus,{passive:true})}
  runtime.cleanupSheetVersionMenu=()=>{runtime.savedSheetVersionMenu=runtime.captureVersionMenus()[0]||null;runtime.closeSheetVersionMenu();doc.removeEventListener("pointerdown",outside,true);view?.removeEventListener("resize",runtime.positionSheetVersionMenu);root.removeEventListener("scroll",runtime.positionSheetVersionMenu,true);for(const event of ["pointerdown","focusin","wheel"])root.removeEventListener(event,runtime.onSheetPaneFocus)}
}
function setupVersionControls(runtime){
  const currentWork=()=>String(runtime.data?.stack?.work?.id||"")
  const emit=action=>runtime.api?.setTriggerValue("version_action",{...action,nonce:`${Date.now()}-${Math.random()}`})
  runtime.chooseBuildVersion=workId=>{
    workId=String(workId);const option=arr(runtime.data?.build_versions).find(row=>String(row.work_id||row.id)===workId)
    if(option&&option.available!==false&&workId!==currentWork())emit({kind:"build",work_id:workId,source_work_id:currentWork()})
  }
  const sheetFor=input=>{
    const menu=input?.closest?.("[data-sheet-versions]")
    if(!menu||menu.closest("[data-connection-book],[data-connection-field]")||menu.dataset.versionWork!==currentWork())return null
    const unit=activeTranslationSheet(runtime.data,runtime.focused)
    return unit&&String(unit.id)===menu.dataset.sheetVersions?{menu,unit,versions:unit.sheet_versions||{}}:null
  }
  runtime.onVersionChange=event=>{
    const input=event.target
    if(input?.matches?.("[data-build-version]")){
      runtime.chooseBuildVersion(input.value)
      return
    }
    if(!input?.matches?.("[data-sheet-version]"))return
    const sheet=sheetFor(input),option=arr(sheet?.versions.options).find(row=>String(row.id)===String(input.value))
    if(sheet&&option&&option.available!==false&&String(input.value)!==String(sheet.versions.selected_id))emit({kind:sheet.unit.type==="SOURCE"?"source":"sheet",work_id:currentWork(),unit_id:String(sheet.unit.id),variant_id:String(input.value)})
  }
  const onClick=runtime.onClick
  runtime.onClick=event=>{
    const sourceButton=event.target?.closest?.("[data-edit-source]")
    if(sourceButton){
      event.preventDefault()
      const chapter=runtime.data?.stack?.active_chapter
      if(sourceButton.closest("[data-connection-book],[data-connection-field]")||String(chapter?.raw_unit_id)!==sourceButton.dataset.editSource||!arr(chapter?.source_versions?.options).length)return
      runtime.closeSheetVersionMenu?.()
      emit({kind:"edit_source",work_id:currentWork(),unit_id:String(chapter.raw_unit_id)})
      return
    }
    const bookButton=event.target?.closest?.("[data-translate-book-scope]")
    if(bookButton?.dataset?.translateBookScope){
      event.preventDefault()
      const scope=bookButton.dataset.translateBookScope,sheet=sheetFor(bookButton)
      if(!sheet||!runtime.data.book_translation_available||!["care","source","both"].includes(scope))return
      runtime.closeSheetVersionMenu?.()
      runtime.api?.setTriggerValue("book_action",{action:"translate_book",work_id:currentWork(),translation_scope:scope,nonce:`${Date.now()}-${Math.random()}`})
      return
    }
    const button=event.target?.closest?.("[data-translate-sheet]")
    if(!button)return onClick(event)
    event.preventDefault()
    const sheet=sheetFor(button),language=sheet?.menu.querySelector("[data-translation-language]")?.value
    if(!sheet||button.disabled||sheet.versions.can_translate===false||!arr(sheet.versions.language_options).some(option=>String(option.code)===String(language)))return
    button.disabled=true;button.textContent="Translating…"
    emit({kind:sheet.unit.type==="SOURCE"?"translate_source":"translate",work_id:currentWork(),unit_id:String(sheet.unit.id),language_code:String(language)})
  }

}
const sheetLayerKey=unit=>unit?.reader_slot|| (String(unit?.type||unit?.layer).toUpperCase()==="MC"?`MC:${mcLevel(unit)||"legacy"}`:String(unit?.type||unit?.layer||""))
const paneLayerKey=pane=>pane?.dataset?.readerSlot||(pane?.dataset?.layer==="MC"?`MC:${pane.dataset.mcLevel||"legacy"}`:pane?.dataset?.layer||"SOURCE")
function paneForLayer(root,key){
  const slotted=root.querySelector(`[data-reader-slot="${CSS.escape(key)}"]`);if(slotted)return slotted
  if(String(key).startsWith("MC:")){const level=String(key).split(":")[1];return root.querySelector(level==="legacy"?'[data-layer="MC"]:not([data-mc-level])':`[data-layer="MC"][data-mc-level="${CSS.escape(level)}"]`)}
  return root.querySelector(`[data-layer="${CSS.escape(key)}"]`)
}
function sliderOptions(stack,layer){
  if(layer==="ORIGINAL")return arr(stack?.original_reader?.locations)
  if(layer==="SOURCE")return arr(stack?.chapters).filter(row=>row.readable).map(row=>({...row,id:row.raw_unit_id}))
  if(stack?.reader_slots&&Object.hasOwn(stack.sheet_options||{},layer))return arr(stack.sheet_options[layer]).filter(row=>row.available!==false)
  const level=String(layer).startsWith("MC:")?String(layer).split(":")[1]:null
  return arr(stack?.sheet_options?.[level?"MC":layer]).filter(row=>row.available!==false&&(!level||(mcLevel(row)||"legacy").toString()===level))
}
const sliderPosition=(value,length)=>Math.max(0,Math.min(Math.max(0,length-1),Number(value)||0))
const sliderIndex=(value,length)=>Math.round(sliderPosition(value,length))
// Studio uses exact chapter detents; previews stay local until release.
const sliderMagneticPosition=(value,length)=>sliderIndex(value,length)
const sliderMemoryKey=input=>{const workId=input?.closest?.("[data-connection-book]")?.dataset?.connectionBook;return `${workId?`${workId}|`:""}${input.dataset.sheetSlider}`}
const sliderTitle=option=>option.identity?.title||option.title||option.label||option.id
const sliderStopLabel=(option,layer,index)=>option.slider_stop_label||(layer==="ORIGINAL"?`${option.page?'PAGE':option.chapter_number?'CH':'SEC'} ${option.chapter_number||index+1}`:layer==="WB"?"WB":`${layer==="SOURCE"?"CH":readerLayerLabel(layer,option)} ${String(option.chapter_number||option.sequence_number||index+1).padStart(2,"0")}`)
const sliderHeadingOriginals=new WeakMap()
function paintSliderHeading(input,option,index){
  const pane=input.closest?.("[data-pane]")
  if(!pane?.querySelector)return
  let original=sliderHeadingOriginals.get(pane)
  if(!original){
    const fields={}
    for(const name of ["title","simple","kicker","context"]){const node=pane.querySelector(`[data-slider-preview-${name}]`);if(node)fields[name]={node,text:node.textContent}}
    if(!Object.keys(fields).length)return
    original={id:String(pane.querySelector("[data-reading-id]")?.dataset?.readingId||""),fields}
    sliderHeadingOriginals.set(pane,original)
  }
  const layer=String(input.dataset.sheetSlider).split(":")[0],identity=option.identity||{},source=layer==="SOURCE"
  const preview={title:source?(option.heading_title||option.title||sliderTitle(option)):sliderTitle(option),
    simple:paneSimpleTitle({...option,sequence_number:option.sequence_number||index+1},null,layer),
    kicker:source?`CHAPTER ${option.chapter_number||index+1} · EXACT SOURCE`:(identity.kicker||sliderStopLabel(option,layer,index)),
    context:identity.context||option.id}
  const restoring=String(option.id)===original.id
  for(const [name,{node,text}] of Object.entries(original.fields)){
    const next=String((restoring?text:preview[name])??"")
    if(node.textContent!==next)node.textContent=next
  }
}
function keepSliderVisible(input,behavior="auto"){
  const track=input.closest?.("[data-slider-track]")
  if(!track||track.scrollWidth<=track.clientWidth+2)return
  const range=input.getBoundingClientRect(),bounds=track.getBoundingClientRect(),scale=readerLayoutScale(track,bounds),ratio=sliderPosition(input.value,Number(input.max)+1)/Math.max(1,Number(input.max))
  // Reveal only the selected thumb and label. Endpoint labels face inward;
  // intermediate labels need half their width when brought to the viewport edge.
  const radius=input.dataset?.sheetSlider==="ORIGINAL"?6.5:8
  const label=track.querySelector?.('.slider-stop.active .slider-stop-label'),labelMargin=ratio>0&&ratio<1?(label?.getBoundingClientRect?.().width||0)/scale/2+2:0
  const point=(range.left-bounds.left)/scale+track.scrollLeft+radius+ratio*Math.max(0,range.width/scale-2*radius),margin=input.dataset?.sheetSlider==="ORIGINAL"?38:Math.max(10,labelMargin),start=track.scrollLeft
  let target=start
  if(point<start+margin)target=point-margin
  else if(point>start+track.clientWidth-margin)target=point-track.clientWidth+margin
  target=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,target))
  if(Math.abs(target-start)>1)track.scrollTo({left:target,behavior})
}
function paneSlider(stack,layer,activeId){
  const key=layer==="MC"?`MC:${mcLevel(activeId)||"legacy"}`:layer,options=sliderOptions(stack,key),index=options.findIndex(row=>String(row.id)===String(activeId)),active=options[index]
  if(!active)return ""
  if(arr(stack.retained_slider_layers).includes(key))return `<div data-retained-slider="${esc(key)}"></div>`
  const title=sliderTitle(active),label=active.slider_label||(layer==="ORIGINAL"?`Original ${originalLocationNoun(stack.original_reader.kind)}`:layer==="SOURCE"?"Source chapter":`${readerLayerLabel(layer,active)} sheet`),denominator=Math.max(1,options.length-1)
  const stops=options.map((option,position)=>`<button type="button" class="slider-stop${position===index?" active":""}" data-slider-stop="${position}" data-slider-layer="${esc(key)}" style="--stop-x:${position/denominator*100}%" title="${esc(sliderTitle(option))}" aria-label="Choose ${esc(sliderTitle(option))}" aria-pressed="${position===index}" tabindex="${position===index?0:-1}"><span class="slider-dot" aria-hidden="true"></span><span class="slider-stop-label">${esc(sliderStopLabel(option,layer,position))}</span></button>`).join("")
  return `<div class="pane-slider" data-slider-control><div class="slider-heading"><span>${esc(label)}</span><button type="button" class="slider-jump-trigger" data-slider-jump aria-label="Choose ${esc(label.toLowerCase())}" aria-haspopup="dialog" aria-expanded="false"><strong data-slider-title title="${esc(title)}">${esc(title)}</strong><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button><output data-slider-count>${index+1} / ${options.length}</output></div><div class="slider-track" data-slider-track><div class="slider-rail" style="--slider-count:${options.length}"><input type="range" class="sheet-slider" data-sheet-slider="${esc(key)}" min="0" max="${Math.max(0,options.length-1)}" step="1" value="${index}" aria-label="${esc(label)}" aria-valuetext="${esc(title)}" ${options.length<2?"disabled":""} /><div class="slider-stops" role="group" aria-label="${esc(label)} stops">${stops}</div></div></div></div>`
}
const sliderJumpText=value=>String(value??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\b0+(\d+)/g,"$1").trim()
function sliderJumpMatches(options,layer,query=""){
  const terms=sliderJumpText(query).split(/\s+/).filter(Boolean),base=String(layer).split(":")[0]
  return options.map((option,index)=>({option,index,label:sliderStopLabel(option,base,index),title:sliderTitle(option)})).filter(row=>{
    const number=row.option.chapter_number||row.option.sequence_number||row.index+1
    const text=sliderJumpText([row.title,row.label,row.option.label,row.option.id,base==="SOURCE"?`source chapter ${number}`:`${base} sheet ${number}`].join(" "))
    return terms.every(term=>text.includes(term))
  })
}
let sliderJumpSequence=0
function setupSliderJumpMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeSliderJumpMenu=({restoreFocus=false}={})=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    runtime.sliderJumpMenu=null;popup.anchor.setAttribute("aria-expanded","false");popup.anchor.removeAttribute("aria-controls");popup.element.remove()
    if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})
  }
  runtime.positionSliderJumpMenu=()=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    if(popup.anchor.isConnected===false){runtime.closeSliderJumpMenu();return}
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),scale=readerLayoutScale(root,bounds)
    const width=Math.min(380,(bounds.width/scale)-16),height=Math.min(bounds.height,(view?.innerHeight||bounds.bottom)-bounds.top)/scale
    const left=Math.max(8,Math.min(bounds.width/scale-width-8,(anchor.left-bounds.left)/scale)),below=(anchor.bottom-bounds.top)/scale+6
    const above=height-below<150&&(anchor.top-bounds.top)/scale>height-below,top=above?Math.max(8,(anchor.top-bounds.top)/scale-366):below
    Object.assign(popup.element.style,{width:Math.max(0,width)+"px",left:left+"px",top:top+"px",maxHeight:Math.max(0,Math.min(360,above?(anchor.top-bounds.top)/scale-top-6:height-top-8))+"px"})
  }
  runtime.highlightSliderJump=position=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    popup.highlight=Math.max(0,Math.min(popup.matches.length-1,position))
    const choices=[...popup.list.querySelectorAll("[data-slider-jump-choice]")]
    choices.forEach((choice,index)=>choice.toggleAttribute("data-highlighted",index===popup.highlight))
    const active=choices[popup.highlight]
    if(!active){popup.search.removeAttribute("aria-activedescendant");return}
    popup.search.setAttribute("aria-activedescendant",active.id)
    const bounds=popup.list.getBoundingClientRect(),item=active.getBoundingClientRect(),scale=readerLayoutScale(root)
    if(item.top<bounds.top)popup.list.scrollTop+=(item.top-bounds.top)/scale
    else if(item.bottom>bounds.bottom)popup.list.scrollTop+=(item.bottom-bounds.bottom)/scale
  }
  runtime.filterSliderJump=()=>{
    const popup=runtime.sliderJumpMenu;if(!popup)return
    popup.matches=sliderJumpMatches(popup.options,popup.input.dataset.sheetSlider,popup.search.value)
    popup.list.innerHTML=popup.matches.map(row=>`<button type="button" role="option" tabindex="-1" class="slider-jump-option" id="${popup.id}-option-${row.index}" data-slider-jump-choice="${row.index}" aria-selected="${row.index===popup.selected}"><small>${esc(row.label)}</small><strong>${esc(row.title)}</strong><span class="slider-jump-check" aria-hidden="true">${row.index===popup.selected?"✓":""}</span></button>`).join("")
    const kind=popup.input.dataset.sheetSlider==="ORIGINAL"?originalLocationNoun(runtime.data?.stack?.original_reader?.kind):popup.input.dataset.sheetSlider==="SOURCE"?"chapter":"sheet"
    popup.status.textContent=popup.matches.length?`${popup.matches.length} ${kind}${popup.matches.length===1?"":"s"}`:"No matches. Try another title or number."
    popup.list.scrollTop=0
    runtime.highlightSliderJump(popup.search.value?0:Math.max(0,popup.matches.findIndex(row=>row.index===popup.selected)))
  }
  runtime.openSliderJumpMenu=(anchor,{focusSearch=!view?.matchMedia?.("(max-width: 760px), (pointer: coarse)")?.matches}={})=>{
    const same=runtime.sliderJumpMenu?.anchor===anchor
    runtime.closeSliderJumpMenu();if(same)return
    const input=anchor.closest("[data-slider-control]")?.querySelector("[data-sheet-slider]")
    if(!input)return
    const stack=runtime.connectionStack?.(input)||runtime.data?.stack,options=sliderOptions(stack,input.dataset.sheetSlider)
    if(!options.length)return
    runtime.closeBookMenu?.();runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeBookmarkMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement("section"),id=`slider-jump-${++sliderJumpSequence}`,label=input.getAttribute("aria-label")||"Chapter or sheet"
    element.id=id;element.className="slider-jump-menu";element.setAttribute("role","dialog");element.setAttribute("tabindex","-1");element.setAttribute("aria-label",`Choose ${label.toLowerCase()}`)
    element.style.setProperty("--pane-accent",view?.getComputedStyle?.(anchor).getPropertyValue("--pane-accent")||"#8ca9bd")
    element.innerHTML=`<div class="slider-jump-search-row"><label for="${id}-search">Choose ${esc(label.toLowerCase())}</label><input id="${id}-search" data-slider-jump-search type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${id}-list" autocomplete="off" spellcheck="false" placeholder="Search by title or number…"></div><div class="slider-jump-options" id="${id}-list" role="listbox" aria-label="${esc(label)}"></div><p class="slider-jump-status" role="status" aria-live="polite"></p>`
    root.append(element)
    const popup={anchor,input,options,element,id,selected:sliderIndex(input.value,options.length),search:element.querySelector("[data-slider-jump-search]"),list:element.querySelector(".slider-jump-options"),status:element.querySelector(".slider-jump-status"),matches:[],highlight:0}
    runtime.sliderJumpMenu=popup;anchor.setAttribute("aria-expanded","true");anchor.setAttribute("aria-controls",id)
    popup.search.oninput=runtime.filterSliderJump
    runtime.positionSliderJumpMenu();runtime.filterSliderJump()
    // Touch readers can browse the list without opening the on-screen keyboard.
    // Search still focuses normally when tapped or explicitly reached by keyboard.
    ;(focusSearch?popup.search:popup.element).focus({preventScroll:true})
  }
  const choose=index=>{
    const popup=runtime.sliderJumpMenu;if(!popup||!popup.matches.some(row=>row.index===index))return
    if(index!==popup.selected)runtime.sliderJumpFocus={layer:popup.input.dataset.sheetSlider,book:popup.input.closest("[data-connection-book]")?.dataset.connectionBook||"",work:String(runtime.data?.stack?.work?.id||""),connection:String(runtime.data?.connection?.id||"")}
    runtime.closeSliderJumpMenu({restoreFocus:true});runtime.chooseSlider(popup.input,index)
  }
  const click=runtime.onClick
  runtime.onClick=event=>{
    const anchor=event.target?.closest?.("[data-slider-jump]")
    if(anchor){event.preventDefault();runtime.openSliderJumpMenu(anchor,{focusSearch:["touch","pen"].includes(event.pointerType)?false:undefined});return}
    const choice=event.target?.closest?.("[data-slider-jump-choice]")
    if(choice&&runtime.sliderJumpMenu?.element.contains(choice)){event.preventDefault();choose(Number(choice.dataset.sliderJumpChoice));return}
    return click(event)
  }
  const key=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.sliderJumpMenu,anchor=event.target?.closest?.("[data-slider-jump]")
    if(!popup&&anchor&&["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();runtime.openSliderJumpMenu(anchor,{focusSearch:true});return}
    if(!popup)return key(event)
    if(event.key==="Escape"){event.preventDefault();event.stopPropagation?.();runtime.closeSliderJumpMenu({restoreFocus:true});return}
    if(event.key==="Tab"){
      if(event.target===popup.element&&!event.shiftKey){event.preventDefault();popup.search.focus({preventScroll:true});return}
      runtime.closeSliderJumpMenu({restoreFocus:true});return
    }
    if(!popup.element.contains(event.target))return key(event)
    event.stopPropagation?.()
    if(event.isComposing||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();runtime.highlightSliderJump(popup.highlight+(event.key==="ArrowDown"?1:-1));return}
    if(event.key==="Enter"){event.preventDefault();const row=popup.matches[popup.highlight];if(row)choose(row.index)}
  }
  const wheel=runtime.onWheel
  runtime.onWheel=event=>{if(event.target?.closest?.(".slider-jump-menu"))return;return wheel(event)}
  const outside=event=>{const popup=runtime.sliderJumpMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeSliderJumpMenu()}
  const blur=event=>{const popup=runtime.sliderJumpMenu;if(popup&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeSliderJumpMenu()}
  runtime.attachSliderJumpMenu=()=>{doc.addEventListener("pointerdown",outside,true);root.addEventListener("focusin",blur);root.addEventListener("scroll",runtime.positionSliderJumpMenu,true);view?.addEventListener("resize",runtime.positionSliderJumpMenu)}
  runtime.restoreSliderJumpMenu=reuseReading=>{
    const saved=runtime.savedSliderJumpMenu,focus=runtime.sliderJumpFocus
    runtime.savedSliderJumpMenu=null;runtime.sliderJumpFocus=null
    if(saved&&reuseReading&&saved.signature===runtime.renderSignature&&saved.anchor.isConnected!==false){
      runtime.openSliderJumpMenu(saved.anchor,{focusSearch:saved.searchFocused})
      const popup=runtime.sliderJumpMenu
      if(popup){popup.search.value=saved.query;runtime.filterSliderJump();runtime.highlightSliderJump(saved.highlight)}
    }
    if(focus&&focus.work===String(runtime.data?.stack?.work?.id||"")&&focus.connection===String(runtime.data?.connection?.id||"")){
      const input=[...root.querySelectorAll(`[data-sheet-slider="${CSS.escape(focus.layer)}"]`)].find(input=>(input.closest("[data-connection-book]")?.dataset.connectionBook||"")===focus.book)
      input?.closest("[data-slider-control]")?.querySelector("[data-slider-jump]")?.focus({preventScroll:true})
    }
  }
  runtime.cleanupSliderJumpMenu=()=>{
    const popup=runtime.sliderJumpMenu
    runtime.savedSliderJumpMenu=popup?{anchor:popup.anchor,signature:runtime.renderSignature,query:popup.search.value,highlight:popup.highlight,searchFocused:popup.search.matches(":focus")}:null
    runtime.closeSliderJumpMenu();doc.removeEventListener("pointerdown",outside,true);root.removeEventListener("focusin",blur);root.removeEventListener("scroll",runtime.positionSliderJumpMenu,true);view?.removeEventListener("resize",runtime.positionSliderJumpMenu)
  }
}
const layerRank=layer=>({SOURCE:0,PASSAGE:0,CH:1,CL:2,MC:3,WB:4})[String(layer||"").toUpperCase()] ?? 9
const ROUTE_MODES=["outgoing","both","incoming"]
const isRouteReference=reference=>["axiom","passage"].includes(reference?.kind)
const routeMode=reference=>reference?.kind==="passage"?"outgoing":ROUTE_MODES.includes(reference?.route_mode)?reference.route_mode:"incoming"
const routeModeLabel=mode=>({incoming:"Incoming routes",both:"Incoming and outgoing routes",outgoing:"Outgoing routes"})[mode]||"Incoming routes"
const routeCanMove=reference=>reference?.kind!=="passage"&&String(reference?.layer).toUpperCase()!=="WB"&&(reference?.has_outgoing===true||arr(reference?.available_route_modes).includes("outgoing"))
function routeItems(reference,layer){return arr(reference?.route_layers?.[String(layer||"").toUpperCase()])}
function routeItemsForUnit(reference,unit){
  const items=routeItems(reference,unit.type)
  if(unit.type!=="MC"||(!unit.mc_partitioned&&!mcLevel(unit)&&!items.some(mcLevel)))return items
  return items.filter(item=>mcLevel(item)===mcLevel(unit))
}
function readingRank(unit){
  if(Number.isFinite(unit?.reader_rank))return unit.reader_rank
  const layer=String(unit?.type||unit?.layer||"").toUpperCase(),rank=layerRank(layer),level=layer==="MC"?mcLevel(unit):null
  return rank+(level?level/(level+1)*.5:0)
}
function exactRouteEdges(reference){return arr(reference?.route_edges).filter(edge=>edge.source_id&&edge.target_id)}
const ROUTE_DISPLAY_CACHE=new Map()
function displayRouteEdges(edges,mode='flow',endpoint=(edge,side)=>String(edge[side+'_id'])){
  if(mode==='all'||edges.length<3)return edges
  // Only pass drawable edges here. Simplify the picture, never the recorded
  // evidence: an absent or hidden feeder cannot stand in for a direct trace.
  const rows=edges.map(edge=>({edge,from:endpoint(edge,'source'),to:endpoint(edge,'target')}))
  // Scroll and hover change coordinates far more often than visible topology.
  // Cache only index membership; current edge objects keep their own metadata.
  const key=JSON.stringify(rows.map(row=>[row.from,row.to])),cached=ROUTE_DISPLAY_CACHE.get(key)
  if(cached){ROUTE_DISPLAY_CACHE.delete(key);ROUTE_DISPLAY_CACHE.set(key,cached);return cached.map(index=>edges[index])}
  const outgoing=new Map(),kept=new Set(rows)
  for(const row of rows){if(!outgoing.has(row.from))outgoing.set(row.from,[]);outgoing.get(row.from).push(row)}
  for(const row of rows){
    if(row.from===row.to)continue
    const seen=new Set([row.from]),pending=[]
    // Parallel direct traces do not constitute a route through a feeder.
    for(const next of outgoing.get(row.from)||[])if(kept.has(next)&&next.to!==row.to&&!seen.has(next.to)){seen.add(next.to);pending.push(next.to)}
    let alternate=false
    while(pending.length&&!alternate){
      const current=pending.pop()
      for(const next of outgoing.get(current)||[]){
        if(!kept.has(next))continue
        if(next.to===row.to){alternate=true;break}
        if(!seen.has(next.to)){seen.add(next.to);pending.push(next.to)}
      }
    }
    // Reduce sequentially so cycles cannot remove mutually supporting routes.
    if(alternate)kept.delete(row)
  }
  const indices=rows.flatMap((row,index)=>kept.has(row)?[index]:[])
  ROUTE_DISPLAY_CACHE.set(key,indices)
  if(ROUTE_DISPLAY_CACHE.size>8)ROUTE_DISPLAY_CACHE.delete(ROUTE_DISPLAY_CACHE.keys().next().value)
  return indices.map(index=>edges[index])
}
function routeNodeIndex(reference){
  const nodes=new Map([[String(reference?.id||""),reference]])
  Object.values(reference?.route_layers||{}).forEach(items=>arr(items).forEach(item=>nodes.set(String(item.id),item)))
  return nodes
}
function routeArrival(reference,mode=routeMode(reference)){
  const nodes=routeNodeIndex(reference),edges=exactRouteEdges(reference).filter(edge=>String(edge.target_id)===String(reference.id)),groups=new Map()
  edges.forEach(edge=>{const node=nodes.get(String(edge.source_id));if(!node)return;const key=`${node.layer}|${node.unit_id||node.sheet_title||node.layer}`;if(!groups.has(key))groups.set(key,{node,ids:[]});groups.get(key).ids.push(String(node.id))})
  const outgoing=exactRouteEdges(reference).filter(edge=>String(edge.source_id)===String(reference.id)).map(edge=>{const node=nodes.get(String(edge.target_id));return node?{...node,route_scope:edge.target_pane||""}:null}).filter(Boolean),movable=routeCanMove(reference)
  if(!groups.size&&!outgoing.length&&!movable)return ""
  const rows=edges.map(edge=>({node:nodes.get(String(edge.source_id)),ids:[String(edge.source_id)],scope:edge.source_pane||""})).filter(row=>row.node)
  const centre=mode==="both"?34:mode==="outgoing"?11:57
  const branches=mode==="outgoing"?"":rows.map(({node,ids,scope},index)=>{const y=rows.length===1?16:5+index*22/(rows.length-1),color=layerColor(node.layer,node);return `<g data-route-members="${esc(ids.join("|"))}"${scope?` data-route-scope="${esc(scope)}"`:""}><path class="confluence-thread" stroke="${color}" d="M 6 ${y} C ${mode==="both"?16:28} ${y}, ${mode==="both"?20:32} 16, ${centre-6} 16"/><circle cx="6" cy="${y}" r="${rows.length>8?1:1.7}" fill="${color}"/></g>`}).join("")
  const departures=mode==="incoming"?"":outgoing.map((node,index)=>{const y=outgoing.length===1?16:5+index*22/(outgoing.length-1),color=layerColor(node.layer,node);return `<g data-route-members="${esc(node.id)}"${node.route_scope?` data-route-scope="${esc(node.route_scope)}"`:""}><path class="confluence-thread" stroke="${color}" d="M ${centre+6} 16 C ${mode==="both"?48:36} 16, ${mode==="both"?52:40} ${y}, 62 ${y}"/><circle cx="62" cy="${y}" r="${outgoing.length>8?1:1.7}" fill="${color}"/></g>`}).join("")
  const label=mode==="incoming"?`${edges.length} direct feeder${edges.length===1?"":"s"} from ${groups.size} sheet${groups.size===1?"":"s"} converge into ${reference.id}`:`${routeModeLabel(mode)} for ${reference.id}: ${mode==="both"?`${rows.length} incoming, `:""}${outgoing.length} outgoing`
  const control=movable?`<input class="route-direction-slider" type="range" data-route-direction min="0" max="2" step="1" value="${ROUTE_MODES.indexOf(mode)}" aria-label="Route direction for ${esc(reference.id)}" aria-valuetext="${esc(routeModeLabel(mode))}" title="Move the dot: left — outgoing; centre — both; right — incoming" />`:""
  const fixedHint=reference.kind==="passage"?"Outgoing routes · Recorded uses of this passage":String(reference.layer).toUpperCase()==="WB"?"Incoming routes only · Whole-book level":"Incoming routes only · No outgoing route recorded for this axiom"
  return `<span class="route-arrival"${movable?' data-route-direction-control':` title="${fixedHint}" aria-label="${fixedHint}"`}><svg viewBox="0 0 68 32" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${branches}${departures}<circle class="confluence-target" cx="${centre}" cy="16" r="6"/><circle cx="${centre}" cy="16" r="2.3" fill="${layerColor(reference.layer,reference)}"/></svg>${control}</span>`
}
function routeFocusHead(reference,label,direction="incoming"){return `<header class="route-focus-head"><div><span>${direction==="outgoing"?"FLOWING FROM":"FEEDING INTO"} · ${esc(reference.layer)}</span><strong>${esc(reference?.id||"Selected axiom")}</strong><span>${direction==="outgoing"?"Hover an axiom to illuminate its connections.":"Hover a feeder to illuminate its connections."}</span></div><button type="button" class="route-close" data-clear-reference aria-label="Close route focus">×</button></header>`}
function routeGroups(items,selectedId){
  const groups=new Map()
  arr(items).forEach(item=>{const key=String(item.source_pane||item.unit_id||item.sheet_title||item.layer||"TRACE");if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)})
  return [...groups.entries()].map(([key,rows])=>{const first=rows[0]||{},title=first.sheet_title||first.chapter_title||key||first.layer,mc=String(first.layer||"").toUpperCase()==="MC"&&mcLevel(first);const cards=rows.map(item=>`<div class="axiom-row"${item.source_pane?` data-connection-source-pane="${esc(item.source_pane)}"`:""}><button type="button" class="route-card ${String(item.id)===selectedId?"selected":""}"${String(item.layer||"").toUpperCase()==="MC"&&mcLevel(item)?` style="--pane-accent:${layerColor(item.layer,item)}"`:""} data-ref-id="${esc(item.id)}" data-select-axiom="${esc(item.id)}" data-selection-unit="${esc(item.unit_id||String(item.id).split(':')[0])}" aria-pressed="false"><span class="route-card-id" ${axiomCopyAttributes(item.id)}>${esc(readerLayerLabel(item.layer||item.kind,item))} · ${esc(item.local_id||item.id)}</span><span class="route-card-text">${item.reading_html ?? esc(item.text||item.title)}</span><span class="route-card-via">${arr(item.feeds_ids).length?`FEEDS → ${arr(item.feeds_ids).map(esc).join(" · ")}`:item.feeds_id?`FEEDS → ${esc(item.feeds_id)}`:"REGISTERED ROUTE"}</span></button>${axiomCopyStatus()}<button type="button" class="axiom-routes" data-open-axiom-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button></div>`).join("");return `<section class="route-sheet"${mc?` style="--pane-accent:${layerColor("MC",first)}"`:""}><h3><span>${esc(mc?`${readerLayerLabel("MC",first)} · ${title}`:title||"Registered sheet")}</span><b>${rows.length}</b></h3><div class="route-list">${cards}</div></section>`}).join("")
}
function sameLayerRouteItems(reference,direction){
  if(reference?.kind!=="axiom"||routeMode(reference)===(direction==="incoming"?"outgoing":"incoming"))return []
  // Every recorded peer gets its own endpoint beside the focus, including
  // inputs from another section of the selected sheet.
  const edges=exactRouteEdges(reference),seen=new Set([String(reference.id)]),pending=[String(reference.id)]
  while(pending.length){const id=pending.pop();for(const edge of edges){const from=String(direction==="incoming"?edge.target_id:edge.source_id),to=String(direction==="incoming"?edge.source_id:edge.target_id);if(from===id&&!seen.has(to)){seen.add(to);pending.push(to)}}}
  return routeItems(reference,reference.layer).filter(item=>String(item.id)!==String(reference.id)&&seen.has(String(item.id))&&(reference.layer!=="MC"||!mcLevel(reference)||mcLevel(item)===mcLevel(reference)))
}
function sameLayerRoutePane(reference,direction,items){
  if(!items.length)return ""
  const layer=reference.layer,id=`route-${layer}-${direction}`,outgoing=direction==="outgoing",withinSheet=items.some(item=>String(item.unit_id)===String(reference.unit_id))
  return `<section class="desk-window care-pane route-pane" data-pane="${esc(id)}" data-layer="${esc(layer)}" data-route-intermediate="${direction}" style="--pane-accent:${layerColor(layer)}"><div class="window-titlebar"><strong>${esc(layer)} / ${outgoing?"FOLLOWING":"FEEDING"} ${withinSheet?"AXIOMS":"SHEETS"}</strong><span>${items.length} EXACT</span></div><div class="window-body"><div class="route-focus">${routeFocusHead(reference,layer,direction)}${routeGroups(items,String(reference.id))}</div></div></section>`
}
function sourceRoutePane(data,selectedId,reference){
  const sourceFocus=reference.kind==="passage",items=sourceFocus?[reference]:routeItems(reference,"SOURCE")
  const passages=items.map(item=>`<div class="passage-row"><article class="route-source-card ${String(item.id)===selectedId?"selected":""}" data-ref-id="${esc(item.id)}" data-select-passage="${esc(item.id)}" data-source-unit="${esc(item.unit_id||String(item.id).split(':')[0])}" role="button" tabindex="0" aria-pressed="false"><span class="passage-address"><span>${esc(item.id)}</span><b>${esc(item.sheet_title||item.title||"Exact source")}</b></span>${typeof item.reading_block_html === "string" ? `<div class="passage-text">${item.reading_block_html}</div>` : `<span class="passage-text">${esc(item.text)}</span>`}</article>${String(item.id)===selectedId?'':`<button type="button" class="axiom-routes passage-routes" data-open-passage-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button>`}</div>`).join("")
  const emptySource=arr(reference.linked_axioms).length?"Recorded links for this passage could not be resolved to available axioms.":"No recorded axiom uses this passage."
  const content=sourceFocus?`<div class="route-axiom-row">${passages}${routeArrival(reference)}</div>${exactRouteEdges(reference).some(edge=>String(edge.source_id)===selectedId)?"":`<div class="route-empty">${emptySource}</div>`}`:passages||'<div class="route-empty">No registered passage has been resolved on this route yet. The axiom chain remains visible in the CARE panes.</div>'
  return `<section class="desk-window source-pane route-pane" data-pane="source" data-layer="SOURCE" style="--pane-accent:#8a431d"><div class="window-titlebar"><strong>SOURCE / EXACT ROUTE</strong><span>${items.length} PASSAGES</span></div><div class="window-body"><div class="route-source-copy">${routeFocusHead(reference,"The source pane",sourceFocus?"outgoing":"incoming")}${content}</div></div></section>`
}
function sourcePane(data,selectedId,reference){
  if(isRouteReference(reference))return sourceRoutePane(data,selectedId,reference)
  const chapter=data?.active_chapter
  if(!chapter)return `<section class="desk-window source-pane" data-pane="source" data-layer="SOURCE" style="--pane-accent:#8a431d"><div class="window-titlebar"><strong>SOURCE TEXT</strong><span>NOT REGISTERED</span></div><div class="window-body"><div class="inspector-empty"><div><b>NO READABLE CHAPTER</b><p>This book can still expose its available CARE sheets. Add or repair the source in CARE Library settings when needed.</p></div></div></div></section>`
  // Direct references can precede passage-alignment registration. Protect
  // every reference visible in the saved reading as well as the trace count.
  const sourceDetailsInUse=new Set(arr(data.care_path).flatMap(unit=>[...arr(unit.items),...arr(unit.sections).flatMap(section=>arr(section.items))]).flatMap(item=>[...arr(item.source_trace),...arr(item.deep_source_trace),...arr(item.matrix_trace),...arr(item.passage_trace_ids)]).map(String))
  const passages=arr(chapter.passages).map(passage=>{
    return `<div class="passage-row"><article class="passage ${String(passage.id)===selectedId?"selected":""}" data-ref-id="${esc(passage.id)}" data-select-passage="${esc(passage.id)}" data-source-unit="${esc(chapter.raw_unit_id)}" data-beautiful-compact="${!sourceDetailsInUse.has(String(passage.id))&&beautifulSourceDetail(passage)}" data-beautiful-omit-prefix="${esc(passage.beautiful_omit_prefix||'')}" data-beautiful-opening-foldable="${!sourceDetailsInUse.has(String(passage.id))&&beautifulHeadingDetail(passage)}" role="button" tabindex="0" aria-pressed="false" aria-describedby="desk-selection-help"><span class="passage-address">${esc(passage.address||passage.id)}</span><div class="passage-text" dir="auto">${passage.reading_block_html ?? esc(passage.text)}</div></article><button type="button" class="axiom-routes passage-routes" data-open-passage-routes="${esc(passage.id)}" aria-label="Open Routes for ${esc(passage.id)}" hidden>Routes →</button></div>`
  }).join("")
  return `<section class="desk-window source-pane" data-pane="source" data-layer="SOURCE" style="--pane-accent:#8a431d"><div class="window-titlebar"><strong><span class="reader-full-title">SOURCE / ${esc(chapter.label||chapter.title)}</span><span class="reader-simple-title">SOURCE${chapter.chapter_number?` / ${esc(chapter.chapter_number)}`:""}</span></strong><span>${arr(chapter.passages).length} PASSAGES</span></div>${paneSlider(data,"SOURCE",chapter.raw_unit_id)}<div class="window-body" data-reading-id="${esc(chapter.raw_unit_id)}"><div class="source-layout"><main class="source-copy" data-beautiful-opening-titles="${esc(JSON.stringify(arr(chapter.reading_heading_titles).length?chapter.reading_heading_titles:[chapter.reading_title||chapter.title]))}"><header class="source-head"><span class="pane-kicker" data-slider-preview-kicker>CHAPTER ${esc(chapter.chapter_number||"")} · ${chapter.source_rendition_type==="machine"?"MACHINE TRANSLATION":"EXACT SOURCE"}</span>${sheetVersionTrigger(sourceTranslationSheet(chapter),{pane:true})}${arr(chapter.source_versions?.options).length?`<button type="button" class="pane-language" data-edit-source="${esc(chapter.raw_unit_id)}" title="Edit source and passage size">Edit passages</button>`:""}${chapter.reading_title_context?`<p class="source-heading-context">${esc(chapter.reading_title_context)}</p>`:""}<h2><span class="reader-full-title" data-slider-preview-title>${esc(chapter.reading_title||chapter.title)}</span><span class="reader-simple-title" data-slider-preview-simple>${esc(paneSimpleTitle(chapter,data,"SOURCE"))}</span></h2>${readerPaneImprint(chapter,"SOURCE")}<p>${esc(data?.work?.author||"")}</p></header>${passages||'<p class="trace-empty">No registered passages in this chapter.</p>'}</main></div></div></section>`
}
function traceLabel(item,layer){
  if(String(layer).toUpperCase()==="SOURCE")return "Saved source passage"
  const direct=[...new Set(arr(item.source_trace))],deep=[...new Set([...arr(item.deep_source_trace),...arr(item.matrix_trace)])].filter(id=>!direct.includes(id))
  if(deep.length&&direct.length&&["XR","XS","SC","XA","CB"].includes(String(layer).toUpperCase()))return `${direct.length} direct trace${direct.length===1?"":"s"} · ${deep.length} deeper reference${deep.length===1?"":"s"}`
  const traces=[...direct,...deep]
  const passages=new Set(arr(item.passage_trace_ids).map(String))
  if(String(layer).toUpperCase()==="CH"&&item.grounding_pending&&!passages.size)return "Grounding pending · new passage layer"
  if(String(layer).toUpperCase()==="CH"&&passages.size){
    const refs=[...new Set(traces.map(value=>String(value).trim().replace(/^[\[\]`]+|[\[\]`]+$/g,"")).filter(Boolean))]
    const axioms=refs.filter(id=>!passages.has(id)&&!/^RAW_.*:P\d+$/i.test(id)),unresolved=refs.filter(id=>!passages.has(id)&&/^RAW_.*:P\d+$/i.test(id))
    return [axioms.length?`${axioms.length} axiom trace${axioms.length===1?"":"s"}`:"",`${passages.size} passage trace${passages.size===1?"":"s"}`,unresolved.length?`${unresolved.length} unresolved passage reference${unresolved.length===1?"":"s"}`:""].filter(Boolean).join(" · ")
  }
  return traces.length?`${traces.length} exact trace${traces.length===1?"":"s"}`:"No explicit trace in this record"
}
function routeHistoryControls(history={},options={}){
  const historyAction=options.connected?'data-connection-route-history':'data-route-history',closeAction=options.connected?'data-connection-clear':'data-clear-reference'
  const arrow=(direction,label,enabled,path)=>`<button type="button" class="route-history-arrow" ${historyAction}="${direction}" aria-label="${label}" title="${label}" ${enabled?"":"disabled"}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="${path}"/></svg></button>`
  return `<div class="route-history-actions" role="group" aria-label="Route navigation">${arrow(-1,"Previous route",history.can_back,"M16 10H4m6-6-6 6 6 6")}${arrow(1,"Next route",history.can_forward,"M4 10h12m-6-6 6 6-6 6")}<button type="button" class="route-close" ${closeAction} title="Close route and return to reading"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg><span>Close route</span></button></div>`
}
function carePane(unit,index,selectedId,reference,stack,relocatedIds=new Set(),showVersions=false,bookmarks=[],fieldBookmarks=false){
  const color=unit.pane_accent||layerColor(unit.type,unit)
  const focusLayer=String(reference?.layer||(reference?.kind==="passage"?"PASSAGE":"")).toUpperCase(),isRoute=isRouteReference(reference),isUpstream=isRoute&&readingRank(unit)<readingRank({...reference,layer:focusLayer}),isDownstream=isRoute&&routeMode(reference)!=="incoming"&&readingRank(unit)>readingRank({...reference,layer:focusLayer})
  const mcPartition=unit.type==="MC"&&Boolean(mcLevel(unit)||unit.mc_partitioned),isFocus=String(unit.id)===String(reference?.unit_id),routedItems=routeItemsForUnit(reference,unit),levelAttribute=unit.type==="MC"&&mcLevel(unit)?` data-mc-level="${mcLevel(unit)}"`:""
  if(isUpstream||isDownstream||(isRoute&&mcPartition&&!isFocus&&routedItems.length)){
    const feeders=routedItems,grouped=routeGroups(feeders,selectedId)
    return `<section class="desk-window care-pane route-pane" data-pane="${esc(unit.id)}" data-layer="${esc(unit.type)}"${levelAttribute} style="--pane-accent:${color}"><div class="window-titlebar"><strong>${esc(readerLayerLabel(unit.type,unit))} / ROUTE ${isDownstream?"DESTINATIONS":"FEEDERS"}</strong><span>${feeders.length} EXACT</span></div><div class="window-body"><div class="route-focus">${routeFocusHead(reference,`The ${unit.type} pane`,isDownstream?"outgoing":"incoming")}${grouped||`<div class="route-empty">This route does not name an explicit ${esc(unit.type)} axiom. It may jump across this scale or the trace may not yet be registered.</div>`}</div></div></section>`
  }
  const feederIds=new Set(routedItems.filter(item=>item.resolved!==false).map(item=>String(item.id)))
  // Dialogue sheets keep their original entry point, including text-only dialogues.
  const dialogue=/^WORK_DLG_/i.test(String(stack?.work?.id||unit.work_id||''))||/^CH_DLG_/i.test(String(unit.id||unit.unit_id||''))
  const defaultSectionIndex=dialogue?0:Math.min(1,arr(unit.sections).length-1)
  const sections=arr(unit.sections).map((section,sectionIndex)=>{
    const visibleItems=arr(section.items).filter(item=>String(item.id)===selectedId||!relocatedIds.has(String(item.id)))
    if(!visibleItems.length&&arr(section.items).length)return ""
    const contains=visibleItems.some(item=>String(item.id)===selectedId||feederIds.has(String(item.id)))
    const items=visibleItems.map(item=>{
      const content=`<span class="axiom-id" ${axiomCopyAttributes(item.id)}>${esc(item.address||item.id)} · ${esc(item.id)}</span><span class="axiom-text">${item.reading_html ?? esc(item.text)}</span><span class="axiom-trace">${esc(traceLabel(item,unit.type))}</span>`
      if(isRoute){const button=`<button type="button" class="axiom-button ${String(item.id)===selectedId?"selected":feederIds.has(String(item.id))?"route-feeder":""}" data-ref-id="${esc(item.id)}" data-select-axiom="${esc(item.id)}" data-selection-unit="${esc(unit.id)}" aria-pressed="false">${content}</button>`;return `<div class="axiom-row route-axiom-row">${button}${axiomCopyStatus()}${String(item.id)===selectedId?routeArrival(reference):`<button type="button" class="axiom-routes" data-open-axiom-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button>`}</div>`}
      return `<div class="axiom-row"${item.source_pane?` data-connection-source-pane="${esc(item.source_pane)}"`:""}><button type="button" class="axiom-button" data-ref-id="${esc(item.id)}" data-select-axiom="${esc(item.id)}" aria-pressed="false" aria-describedby="desk-selection-help">${content}</button>${axiomCopyStatus()}<button type="button" class="axiom-routes" data-open-axiom-routes="${esc(item.id)}" aria-label="Open Routes for ${esc(item.id)}" hidden>Routes →</button></div>`
    }).join("")
    return `<details class="care-section"${section.source_pane?` data-connection-reading="${esc(section.source_pane)}"`:""} ${contains||(!isRoute&&sectionIndex===defaultSectionIndex)?"open":""}><summary><span>${esc(section.number||String(sectionIndex+1))} · ${esc(section.name)}</span><small>${visibleItems.length}</small></summary><div class="axiom-list">${items}</div></details>`
  }).join("")
  const identity=unit.identity||{}
  const sheetItems=new Set(arr(unit.sections).flatMap(section=>arr(section.items)).map(item=>String(item.id))),levelPeers=isRoute&&mcPartition&&isFocus?routedItems.filter(item=>!sheetItems.has(String(item.id))&&String(item.id)!==selectedId):[],levelPeerMarkup=levelPeers.length?`<div class="mc-level-peers">${routeGroups(levelPeers,selectedId)}</div>`:""
  const selectedNote=isRoute&&String(unit.type).toUpperCase()===focusLayer&&(!mcPartition||isFocus)?`<div class="route-recipient"><span>${routeMode(reference)==="incoming"?"Receiving at":routeMode(reference)==="both"?"Flowing through":"Flowing from"} <b>${esc(identity.title||unit.title||unit.id)}</b></span><button type="button" class="route-close route-pane-close" data-clear-reference aria-label="Close route focus" title="Close route"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div>`:""
  const sectionActions=!isRoute&&arr(unit.sections).length?`<div class="sheet-actions" role="group" aria-label="${esc(identity.title||unit.title||unit.id)} sections"><button type="button" data-sheet-sections="collapse" aria-label="Collapse all sections" title="Collapse all sections"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 3 4 4 4-4M4 10h12m-10 7 4-4 4 4"/></svg></button><button type="button" data-sheet-sections="expand" aria-label="Expand all sections" title="Expand all sections"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 4-4 4 4M4 10h12m-10 4 4 4 4-4"/></svg></button></div>`:""
  return `<section class="desk-window care-pane" data-pane="${esc(unit.id)}" data-layer="${esc(unit.type)}"${levelAttribute}${isRoute?"":" data-reading-sheet"}${unit.reader_slot?` data-reader-slot="${esc(unit.reader_slot)}"`:""} style="--pane-accent:${color}"><div class="window-titlebar"><strong>${isRoute?`${esc(readerLayerLabel(unit.type,unit))} / ${esc(identity.title||unit.title||unit.id)}`:`<span class="reader-full-title">${esc(readerLayerLabel(unit.type,unit))} / ${esc(identity.title||unit.title||unit.id)}</span><span class="reader-simple-title">${esc(readerLayerLabel(unit.type,unit))} / ${esc(["CL","MC"].includes(unit.type)?paneSimpleTitle(unit,stack):unit.type==="CH"?`Chapter ${unit.chapter_number||unit.sequence_number||arr(stack?.sheet_options?.CH).findIndex(row=>String(row.id)===String(unit.id))+1||index+1}`:unit.type==="WB"?"Whole book":identity.title||unit.title||unit.id)}</span>`}</strong><span>${unit.item_count??arr(unit.items).length} AXIOMS</span>${showVersions&&!isRoute?paneBookmarkButton(unit,bookmarks,fieldBookmarks):""}</div>${isRoute?"":paneSlider(stack,unit.reader_slot||unit.type,unit.reader_option_id||unit.id)}<div class="window-body" data-reading-id="${esc(unit.reader_option_id||unit.id)}"><header class="care-head">${showVersions&&!isRoute?sheetVersionTrigger(unit,{pane:true}):""}<span class="pane-kicker"${isRoute?"":" data-slider-preview-kicker"}>${esc(identity.kicker||unit.type||"CARE SHEET")}</span><div class="care-heading"><h2>${isRoute?esc(identity.title||unit.title||unit.label):`<span class="reader-full-title" data-slider-preview-title>${esc(identity.title||unit.title||unit.label)}</span><span class="reader-simple-title" data-slider-preview-simple>${esc(paneSimpleTitle(unit,stack))}</span>`}</h2>${sectionActions}</div>${readerPaneImprint(unit)}<p${isRoute?"":` data-slider-preview-context${["CL","MC"].includes(unit.type)?` class="title-chapter-trail" title="${esc(identity.context||unit.id)}"`:""}`}>${esc(identity.context||unit.id)}</p></header>${selectedNote}${levelPeerMarkup}<div class="care-sections">${sections||'<p class="trace-empty">No readable axioms in this sheet.</p>'}</div></div></section>`
}
function traceGroup(title,items,empty){
  const rows=arr(items).map(item=>`<button type="button" class="trace-card" data-ref-id="${esc(item.id)}" ${item.kind==="unresolved"?"disabled":""}><strong>${esc(item.layer||item.kind)} · ${esc(item.id)}</strong><span>${esc(textClip(item.reading_text ?? item.text ?? item.title,220))}</span></button>`).join("")
  return `<section class="trace-group"><h4>${esc(title)}<b>${arr(items).length}</b></h4>${rows?`<div class="trace-list">${rows}</div>`:`<div class="trace-empty">${esc(empty)}</div>`}</section>`
}
function inspectorPane(reference,reviewer,rating){
  if(!reference)return `<section class="desk-window inspector-pane" data-pane="inspector" style="--pane-accent:#333"><div class="window-titlebar"><strong>TRACE INSPECTOR</strong><span>READY</span></div><div class="window-body"><div class="inspector-empty"><div><b>CLICK ANY PASSAGE OR AXIOM</b><p>The desk will move here with exact provenance, same-sheet uses, higher-layer descendants, and personal ratings.</p></div></div></div></section>`
  const source=reference.kind==="passage"
  const stars=[1,2,3,4,5].map(score=>`<button type="button" class="star ${score<=Number(rating||0)?"active":""}" data-rate="${score}" data-rate-id="${esc(reference.id)}" aria-label="Rate ${score} stars">★</button>`).join("")
  const groups=source
    ? traceGroup("AXIOMS GROUNDED HERE",reference.linked_axioms,"No CH axiom is directly aligned to this passage yet.")
    : traceGroup("USED BY · SAME SHEET",reference.used_by_same_sheet,"No other axiom on this sheet explicitly names it.")+
      traceGroup("BUILT FROM",reference.built_from,"No earlier explicit trace is recorded.")+
      traceGroup("EXACT SOURCE PASSAGES",reference.source_passages||reference.passages,"No registered source passage has been resolved yet.")+
      traceGroup("USED BY · LATER LAYERS",reference.used_by_elsewhere,"No derived axiom explicitly names it yet.")
  return `<section class="desk-window inspector-pane" data-pane="inspector" style="--pane-accent:${layerColor(reference.layer,reference)}"><div class="window-titlebar"><strong>TRACE INSPECTOR / ${esc(reference.layer||reference.kind)}</strong><span>${source?"PASSAGE":"AXIOM"}</span></div><div class="window-body"><article class="inspector-content"><button type="button" class="route-close" data-clear-reference>× CLOSE FOCUS</button><div class="inspect-id">${esc(reference.id)}</div><h3 class="inspect-title">${esc(reference.title||reference.id)}</h3>${source && typeof reference.reading_block_html === "string" ? `<div class="inspect-text source">${reference.reading_block_html}</div>` : `<p class="inspect-text ${source?"source":""}">${reference.reading_html ?? esc(reference.text)}</p>`}<p class="inspect-meta">${esc(reference.metadata||"")}</p>${source?"":`<div class="rating-box"><div class="rating-head"><strong>${esc(reviewer||"Reader")}'S RATING</strong><span>${Number(rating||0)?`${Number(rating)} / 5`:"NOT RATED"}</span></div><div class="stars">${stars}</div></div>`}${groups}</article></div></section>`
}
function loadingScreen(){return `<div class="load-screen" data-load-screen><div class="load-box"><div class="load-title"><span>OPENING CARE DESK</span><span>READING LINEAGE</span></div><div class="care-wire"><div class="wire-node">CH</div><div class="wire-node">CL</div><div class="wire-node">MC</div><div class="wire-node">WB</div></div><div class="load-caption">Keeping source and every scale in one navigable line…</div></div></div>`}
function connectionControls(data){return connectionDiscoveryControls(data)}

function connectionTabRail(tabs,data){
  if(!data?.connection)return `<div class="desk-tabs">${tabs}</div>`
  return `<div class="connection-tab-rail" aria-label="Reading panes"><button type="button" class="connection-tab-scroll" data-connection-tabs-scroll="-1" aria-label="Earlier pane tabs">‹</button><div class="desk-tabs">${tabs}</div><button type="button" class="connection-tab-scroll" data-connection-tabs-scroll="1" aria-label="Later pane tabs">›</button></div>`
}
function connectionPaneTab(id,label){return paneTab(id,label).replace('<button ',`<button title="${esc(label)}" `)}
const connectionPaneId=(kind,scope,id)=>`connection:${kind}:${scope}:${id}`
function connectionScopeMarkup(html,kind,scope){
  const attribute=kind==="book"?"data-connection-book":"data-connection-field"
  // Namespace pane and reading positions. The original unit and axiom addresses
  // remain intact for routing; two editions may legitimately share an address.
  return html.replace(/data-pane="([^"]*)"/g,(_,id)=>`${attribute}="${esc(scope)}" data-original-pane="${id}" data-pane="${esc(connectionPaneId(kind,scope,id))}"`).replace(/data-reading-id="([^"]*)"/g,(_,id)=>`data-reading-id="${esc(connectionPaneId(kind,scope,id))}"`)
}
function connectionAllPanes(connection){
  const pending=[...arr(connection?.bundle?.panes),...arr(connection?.bundle?.route_panes),...arr(connection?.reference?.resolution_panes)],panes=[],seen=new Set()
  while(pending.length){const pane=pending.shift();if(!pane||seen.has(pane.id))continue;seen.add(pane.id);panes.push(pane);pending.push(...arr(pane.variants))}
  return panes
}
function connectionFieldUnit(pane,items=null,connection=null){
  const sourceTitles=arr(pane.source_work_titles).length?arr(pane.source_work_titles):arr(pane.input_titles),compared=!sourceTitles.length&&pane.role!=="origin"&&connection?.field==="lateral"
  const titles=compared?arr(connection?.bundle?.members).map(member=>member.title||member.work_title||member.work_id||member.id).filter(Boolean):sourceTitles,name=pane.work_title||pane.title||pane.unit_id||pane.id
  const sections=items?[{number:"",name:pane.layer==="SOURCE"?"Saved source passages":"Recorded routes",items}]:arr(pane.sections)
  return {...pane,id:pane.unit_id||pane.id,type:pane.layer||pane.type,title:name,sections,items:items||pane.items,item_count:items?items.length:arr(pane.items).length||sections.reduce((sum,section)=>sum+arr(section.items).length,0),identity:{title:name,kicker:`${pane.layer||pane.type} · ${pane.version||"Saved reading"}`,context:titles.length?`${compared?"Compared works":"Works feeding this reading"}: ${titles.join(" · ")}`:pane.description||pane.unit_id||""}}
}
function connectionMacroLevel(pane){return mcLevel({...pane,mc_level:pane.macro_level||pane.mc_level})}
function connectionMacroColor(pane){return mcLevelColor({...pane,mc_level:connectionMacroLevel(pane)})}
function connectionLayerLabel(pane){return pane.layer==="MC"?mcLevelLabel({...pane,mc_level:connectionMacroLevel(pane)}):pane.layer}
function groupConnectionLayers(panes,reference){
  if(!reference)return panes
  const result=[],groups=new Map()
  for(const pane of panes){
    if(pane.id===reference.source_pane||(pane.role==="origin"&&!pane.work_id)||!["MC","CL","CH","SOURCE"].includes(pane.layer)){result.push(pane);continue}
    const key=[pane.role||"reading",pane.work_id||"corpus",pane.layer,pane.layer==="MC"?connectionMacroLevel(pane):""].join(":")
    let group=groups.get(key)
    if(!group){group={...pane,macro_level:pane.layer==="MC"?connectionMacroLevel(pane):undefined,grouped_panes:[]};groups.set(key,group);result.push(group)}
    group.grouped_panes.push(pane)
  }
  return result.map(pane=>pane.grouped_panes?.length>1?{...pane,version:"",work_title:pane.work_id?pane.work_title:"",title:pane.work_id?pane.title:`${pane.layer} readings`,source_work_titles:[...new Set(pane.grouped_panes.flatMap(member=>arr(member.source_work_titles)))],id:`layer-group:${pane.role||"reading"}:${pane.work_id||"corpus"}:${pane.layer}:${pane.layer==="MC"?connectionMacroLevel(pane):""}`,unit_id:`layer-group:${pane.work_id||"corpus"}:${pane.layer}:${pane.layer==="MC"?connectionMacroLevel(pane):""}`}:(pane.grouped_panes?.[0]||pane))
}
function connectionLayerSlider(pane){
  const members=arr(pane.grouped_panes);if(members.length<2)return ""
  const choices=[{id:"",title:"All traced readings"},...members.map(member=>({id:member.id,title:resolutionUnitTitle(member)}))]
  return `<div class="pane-slider" data-connection-layer-control><div class="slider-heading"><span>${esc(connectionLayerLabel(pane))} readings</span><strong data-connection-layer-title>All traced readings</strong><output data-connection-layer-count>${members.length} readings</output></div><div class="slider-track" data-slider-track><div class="slider-rail" style="--slider-count:${choices.length}"><input type="range" class="sheet-slider" data-connection-layer-slider min="0" max="${choices.length-1}" step="1" value="0" aria-label="${esc(pane.work_title||pane.title)} · ${esc(pane.layer)} route reading" aria-valuetext="All traced readings"><div class="slider-stops" role="group" aria-label="${esc(pane.layer)} route readings">${choices.map((choice,index)=>`<button type="button" class="slider-stop ${index===0?"active":""}" data-connection-layer-stop="${index}" data-connection-layer-reading="${esc(choice.id)}" data-connection-layer-label="${esc(choice.title)}" style="--stop-x:${index*100/(choices.length-1)}%" title="${esc(choice.title)}" aria-label="Show ${esc(choice.title)}"><span class="slider-dot"></span><span class="slider-stop-label">${index===0?"All":esc(choice.title)}</span></button>`).join("")}</div></div></div></div>`
}
function connectionFieldWindows(connection){
  const reference=connection?.reference,all=connectionAllPanes(connection),cards=reference?[reference,...Object.values(reference.route_layers||{}).flatMap(arr)]:[],byPane=new Map()
  cards.forEach(card=>{if(!card.source_pane)return;if(!byPane.has(card.source_pane))byPane.set(card.source_pane,[]);const rows=byPane.get(card.source_pane);if(!rows.some(item=>item.id===card.id))rows.push(card)})
  const visible=(reference?all.filter(pane=>byPane.has(pane.id)):arr(connection?.bundle?.panes).filter(pane=>pane.role!=="origin")).filter(pane=>connection.hide_xa===false||pane.layer!=="XA")
  // A lateral route keeps its two source shores on their reading sides.
  // Current book layers return when the temporary saved-edition route closes.
  if(reference){
    const origin=String(connection.bundle?.origin_work_id||connection.origin_work_id||connection.bundle?.members?.[0]?.work_id||connection.bundle?.members?.[0]?.id||"")
    const workId=pane=>String(pane.work_id||arr(byPane.get(pane.id)).find(card=>card.work_id)?.work_id||arr(connection.bundle?.members).find(member=>arr(member.source_unit_ids).includes(pane.unit_id))?.work_id||"")
    const side=pane=>pane.id===reference.source_pane?1:connection.field==="lateral"&&workId(pane)&&workId(pane)!==origin?2:0
    const rank=pane=>["SOURCE","PASSAGE","CH","CL","MC","WB","CB","XR","XS","SC","XA"].indexOf(pane.layer)+(pane.layer==="MC"?((connectionMacroLevel(pane)||1)-1)*.1:0)
    visible.sort((a,b)=>side(a)-side(b)||(connection.field==="lateral"?(side(a)===2?rank(b)-rank(a):rank(a)-rank(b)):0))
  }
  const displayed=groupConnectionLayers(visible,reference)
  let windows=displayed.map((pane,index)=>{
    const rows=reference?byPane.get(pane.id):null,wholeSheet=arr(rows).find(card=>card.kind==="sheet"),unit=connectionFieldUnit(pane,wholeSheet?null:rows,connection),scope=String(pane.id)
    if(pane.grouped_panes){
      unit.sections=pane.grouped_panes.map(member=>{const cards=arr(byPane.get(member.id)),whole=cards.some(card=>card.kind==="sheet"),items=(whole?arr(member.items):cards).map(item=>({...item,source_pane:member.id}));return {number:"",source_pane:member.id,name:resolutionUnitTitle(member),items}})
      unit.items=unit.sections.flatMap(section=>section.items);unit.item_count=unit.items.length
      unit.identity={...unit.identity,kicker:`${connectionLayerLabel(pane)} · ${pane.grouped_panes.length} traced readings`}
    }
    if(pane.layer==="MC"){unit.pane_accent=connectionMacroColor(pane);unit.mc_level=connectionMacroLevel(pane)}
    let html=carePane(unit,index,reference?.id||"",null,{})
    if(pane.layer==="MC")html=html.replace('<div class="window-titlebar"><strong>MC /',`<div class="window-titlebar"><strong>${connectionLayerLabel(pane)} /`)
    if(pane.grouped_panes)html=html.replace('<div class="window-body"',connectionLayerSlider(pane)+'<div class="window-body"').replace(/(<details class="care-section"[^>]*)(>)/g,(_,attributes,end)=>attributes.includes(" open")?attributes+end:attributes+" open"+end)
    if(reference){if(!wholeSheet)html=html.replaceAll('class="axiom-button"',`class="axiom-button route-feeder"`);html=html.replace(`data-ref-id="${esc(reference.id)}"`, `data-ref-id="${esc(reference.id)}" data-connection-selected="true"`)}
    if(wholeSheet)html=html.replace('<header class="care-head">',`<header class="care-head" data-ref-id="${esc(wholeSheet.id)}" data-connection-whole-sheet="true">`)
    const note=(pane.role==="origin"?`<p class="connection-edition">${esc(pane.source_verification==="hash-recorded-import-closure"?"Original imported source · input edition not certified":pane.historical_input_verified===false?"Recorded source · matched preserved edition":pane.provenance_verified?"Saved source edition":"Recorded source · edition not certified")}${pane.version?` · ${esc(pane.version)}`:""}</p>`:"")+(pane.historical_input_verified===false?'<p class="connection-edition">Original run did not pin its input edition.</p>':"")+(wholeSheet?'<p class="connection-edition">Whole-book reference · no individual axiom specified</p>':"")
    html=html.replace('<div class="care-sections">',`${note}<div class="care-sections">`)
    return connectionScopeMarkup(html,"field",scope)
  }).join("")
  const unresolved=cards.filter(card=>card.resolved===false||card.kind==="unresolved")
  if(unresolved.length)windows+=`<section class="desk-window care-pane connection-unresolved" data-pane="connection:unresolved" data-layer="TRACE"><div class="window-titlebar"><strong>Sources awaiting exact text</strong><span>${unresolved.length}</span></div><div class="window-body"><header class="care-head"><h2>Recorded source references</h2><p>These references are kept as recorded. Their exact saved text is unavailable.</p></header>${unresolved.map(card=>`<article class="route-card"><span class="route-card-id">${esc(card.work_title||card.unit_id||card.id)}</span><span class="route-card-text">${esc(card.id)}</span><span class="route-card-via">${esc(card.text||card.metadata||"Exact source edition could not be resolved.")}</span></article>`).join("")}</div></section>`
  return {windows,panes:displayed}
}
function studyPanes(stack,reference){
  let units=[...arr(stack?.care_path)]
  const routes=routeItems(reference,"MC"),focusMC=reference?.layer==="MC"?reference:null,detailed=[...units.filter(unit=>unit.type==="MC"),...routes,...(focusMC?[focusMC]:[])].some(mcLevel)
  if(detailed){
    const levels=new Map()
    for(const unit of units.filter(unit=>unit.type==="MC")){const level=mcLevel(unit)||"legacy";if(!levels.has(level)||String(unit.id)===String(reference?.unit_id))levels.set(level,{...unit,mc_partitioned:true})}
    for(const item of [...routes,...(focusMC?[focusMC]:[])]){
      const level=mcLevel(item)||"legacy",id=String(item.unit_id||String(item.id).split(":")[0]||`route-MC-${level}`),selected=String(item.id)===String(reference?.id)
      if(!levels.has(level)||(selected&&String(levels.get(level).id)!==id)){
        const current=units.find(unit=>String(unit.id)===id),sameSheet=routes.filter(row=>String(row.unit_id||String(row.id).split(":")[0])===id&&String(row.id)!==String(item.id)),items=selected?[item,...sameSheet]:[]
        levels.set(level,current?{...current,mc_partitioned:true}:{id,type:"MC",mc_level:mcLevel(item),mc_partitioned:true,title:item.sheet_title||item.chapter_title||readerLayerLabel("MC",item),sections:items.length?[{name:"Recorded axioms",items}]:[],items})
      }
    }
    units=[...units.filter(unit=>unit.type!=="MC"),...levels.values()].sort((a,b)=>readingRank(a)-readingRank(b))
  }
  const outgoing=reference?.kind==="axiom"&&routeMode(reference)==="outgoing",routeLevels=new Set(routes.map(item=>mcLevel(item)||"legacy"))
  const panes=units.filter(unit=>!outgoing||readingRank(unit)>=readingRank(reference)||(unit.type==="MC"&&routeLevels.has(mcLevel(unit)||"legacy")))
  if(reference?.kind==="passage"){
    const seen=new Set()
    for(let index=0;index<panes.length;){const key=sheetLayerKey(panes[index]);if(seen.has(key))panes.splice(index,1);else{seen.add(key);index++}}
    for(const layer of ["CH","CL","MC","WB","TRACE"])if(routeItems(reference,layer).length&&!panes.some(unit=>unit.type===layer))panes.push({id:`route-${layer}-outgoing`,type:layer})
    panes.sort((a,b)=>readingRank(a)-readingRank(b))
  }
  return panes
}
function connectionBookWindows(stack){
  const reference=stack.reference||null,selectedId=String(reference?.id||""),workId=String(stack.work?.id||""),outgoingOnly=reference?.kind==="axiom"&&routeMode(reference)==="outgoing"
  const units=studyPanes(stack,reference),partitionedMC=reference?.layer==="MC"&&Boolean(mcLevel(reference)||units.some(unit=>unit.type==="MC"&&unit.mc_partitioned))
  const incoming=partitionedMC?[]:sameLayerRouteItems(reference,"incoming"),outgoing=partitionedMC?[]:sameLayerRouteItems(reference,"outgoing").filter(item=>!incoming.some(peer=>peer.id===item.id)),relocated=new Set([...incoming,...outgoing].map(item=>String(item.id)))
  const rows=units.flatMap((unit,index)=>{const focus=String(unit.id)===String(reference?.unit_id);return [focus?sameLayerRoutePane(reference,"incoming",incoming):"",carePane(unit,index,selectedId,reference,stack,focus?relocated:new Set()),focus?sameLayerRoutePane(reference,"outgoing",outgoing):""]})
  const windows=[...rows.reverse(),outgoingOnly?"":sourcePane(stack,selectedId,reference)].join("").replaceAll('<div class="window-titlebar"><strong>',`<div class="window-titlebar"><strong>${esc(stack.work?.title||"Connected book")} · `)
  const edition=`<span class="connection-edition-label">${esc(stack.edition_label||"Current Library edition")}</span>`
  return connectionScopeMarkup(windows.replaceAll('<header class="care-head">',`<header class="care-head">${edition}`).replaceAll('<header class="source-head">',`<header class="source-head">${edition}`),"book",workId)
}
function connectionWindows(data){
  const connection=data?.connection
  if(!connection)return {windows:"",tabs:""}
  const field=connectionFieldWindows(connection),others=connection.reference?[]:arr(connection.other_stacks)
  const tabs=field.panes.map(pane=>connectionPaneTab(connectionPaneId("field",pane.id,pane.unit_id||pane.id),`${connectionLayerLabel(pane)} · ${pane.work_title||pane.title}`)).join("")+others.map(stack=>connectionPaneTab(connectionPaneId("book",stack.work?.id,arr(stack.care_path).at(-1)?.id||"source"),stack.work?.title||"Connected book")).join("")
  return {windows:field.windows+others.map(connectionBookWindows).join(""),tabs,threePaneRoute:connection.field==="lateral"&&Boolean(connection.reference)&&field.panes.length===3&&!field.windows.includes("connection-unresolved")}
}
function workspace(data){
  const stack=data?.stack||{},reference=data?.reference||null,selectedId=String(reference?.id||data?.selected_reference_id||"")
  const connectedRouting=Boolean(data?.connection?.reference)
  const outgoingOnly=reference?.kind==="axiom"&&routeMode(reference)==="outgoing"
  const panes=studyPanes(stack,reference),partitionedMC=reference?.layer==="MC"&&Boolean(mcLevel(reference)||panes.some(unit=>unit.type==="MC"&&unit.mc_partitioned))
  const incomingPeers=partitionedMC?[]:sameLayerRouteItems(reference,"incoming"),outgoingPeers=partitionedMC?[]:sameLayerRouteItems(reference,"outgoing").filter(item=>!incomingPeers.some(peer=>peer.id===item.id))
  const relocatedIds=new Set([...incomingPeers,...outgoingPeers].map(item=>String(item.id)))
  const isFocus=unit=>String(unit.id)===String(reference?.unit_id)
  const connected=connectionWindows(data)
  const tabs=(originalReaderPayload(data)?paneTab("original","ORIGINAL"):"")+(dialogueMedia(data)?paneTab("dialogue-media",dialogueMedia(data).kind==="audio"?"AUDIO":"VIDEO"):"")+(connectedRouting?"":[outgoingOnly?"":paneTab("source","SOURCE"),dialogueExchangePane(data)?paneTab("dialogue-exchange","EXCHANGE"):"",...panes.map(unit=>`${isFocus(unit)&&incomingPeers.length?paneTab(`route-${unit.type}-incoming`,`${unit.type} · IN`):""}${paneTab(unit.id,readerLayerLabel(unit.type,unit))}${isFocus(unit)&&outgoingPeers.length?paneTab(`route-${unit.type}-outgoing`,`${unit.type} · OUT`):""}`)].join(""))+connected.tabs+(dialogueThinkerPane(data)?paneTab("dialogue-thinkers","THINKERS"):"")+(dialogueWBPane(data)?paneTab("dialogue-wb","WB SOURCE"):"")
  const retained=id=>arr(data.retained_reading_panes).includes(String(id))?`<section data-retained-pane="${esc(id)}"></section>`:""
  const windows=originalReaderPane(data)+dialoguePane(data)+(connectedRouting?"":[outgoingOnly?"":retained("source")||sourcePane(stack,selectedId,reference),dialogueExchangePane(data),...panes.map((unit,index)=>`${isFocus(unit)?sameLayerRoutePane(reference,"incoming",incomingPeers):""}${retained(unit.id)||carePane(unit,index,selectedId,reference,stack,isFocus(unit)?relocatedIds:new Set(),true,bookBookmarks(data))}${isFocus(unit)?sameLayerRoutePane(reference,"outgoing",outgoingPeers):""}`)].join(""))+connected.windows+dialogueThinkerPane(data)+dialogueWBPane(data)
  const activeRoute=connectedRouting?data.connection.reference:reference
  const routeLabel=routeMode(activeRoute)==="incoming"?`${esc(activeRoute?.layer)} → SOURCE`:routeMode(activeRoute)==="both"?`SOURCE → ${esc(activeRoute?.layer)} → WB`:`${esc(activeRoute?.layer)} → WB`
  const routeToolbar=connectedRouting||isRouteReference(reference)?`<div class="route-toolbar"><span>ROUTE · ${routeLabel}</span>${routeHistoryControls((connectedRouting?data.connection.route_history:data?.route_history)||{},{connected:connectedRouting})}</div>`:""
  return `<div class="desk-toolbar desk-menu-toolbar">${readerMenuBar(data,tabs)}${routeToolbar}<div class="desk-title" title="${esc(stack?.work?.title||"CARE STUDY")}"><strong>${esc(stack?.work?.title||"CARE STUDY")}</strong><span>${esc(stack?.work?.author||"")}</span></div></div><div class="desk-strip${connected.threePaneRoute?" lateral-route-three":""}" data-strip>${windows}${connectionDiscoveryPane(data)}</div>${dialogueDock(data)}<div class="desk-status"><span class="status-cell focus" data-focus-label>FOCUS · SOURCE</span><span class="status-cell">${arr(stack.chapters).length} CHAPTERS</span><span class="status-cell">${panes.length} CARE PANES</span><span class="status-help">${isRouteReference(reference)?`Select to read · Routes opens a new route · Close route returns to every sheet`:"Click to select · ↑ ↓ move axioms · Tab to Routes · [ and ] move panes"}</span></div>${isRouteReference(reference)?"":'<span id="desk-selection-help" class="desk-selection-help">Select this passage or axiom. Up and Down move through passages or expanded sections of this sheet; Home and End move to the first and last visible axiom. Tab to the Routes button to open Routes.</span>'}${loadingScreen()}`
}
const SHELF_STATE_KEY="care-studio-shelf/1"
const SHELF_SORTS=[["title","Title · A–Z"],["title-desc","Title · Z–A"],["author","Author · A–Z"],["newest","Year · newest"],["oldest","Year · oldest"],["added","Recently added"],["visited","Recently visited"],["coverage","Most CARE layers"]]
const SHELF_FIELDS=[["lateral","Laterals"],["corpus","Corpora"],["numo","NUMO"],["living","Living books"],["lateral_sea","Lateral sea"],["grimoire","Solomon’s grimoire"]]
const SHELF_TABS=[["all","All"],["book","Books"],["lecture","Lectures"],["collection","Collections"],["lateral","Laterals"],["corpus","Corpora"]]
const shelfFieldLabel=field=>field==="dialogue"?"Dialogues":SHELF_FIELDS.find(([id])=>id===field)?.[1]||"Reading"
const isShelfField=book=>SHELF_FIELDS.some(([id])=>id===book.field)
const shelfScope=data=>["lateral","corpus","dialogue"].includes(data?.library_scope)?data.library_scope:""
const shelfDefaults=(scope="")=>({kind:scope||"book",query:"",sort:"title",author:"",language:"",layer:"",era:"",collection:"",filtersOpen:false})
const shelfStateFor=(data,state)=>shelfScope(data)?{...state,kind:shelfScope(data),collection:""}:state
const shelfText=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase()
const isCollection=book=>book.item_type==="collection"&&arr(book.members).length>0
const shelfLeaves=books=>arr(books).flatMap(book=>isCollection(book)?shelfLeaves(book.members):[book])
const librarySelectionAvailable=data=>Boolean(data?.library_selection_enabled)&&!shelfScope(data)
const libraryBooks=data=>new Map(shelfLeaves(data?.books).filter(book=>book.id&&!isShelfField(book)&&book.item_type!=="collection"&&!book.archived).map(book=>[String(book.id),book]))
const librarySelectedIds=data=>{const books=libraryBooks(data);return [...new Set(arr(data?.selected_work_ids).map(String))].filter(id=>books.has(id))}
const librarySelecting=data=>typeof data?.library_selecting==="boolean"?data.library_selecting:librarySelectedIds(data).length>0
const libraryMemberIds=book=>[...new Set(shelfLeaves([book]).filter(item=>item.id&&!isShelfField(item)&&item.item_type!=="collection"&&!item.archived).map(item=>String(item.id)))]
function libraryCheckState(book,selected){
  const ids=libraryMemberIds(book),count=ids.filter(id=>selected.has(id)).length
  return count===0?"false":count===ids.length?"true":"mixed"
}
function librarySelectionTray(data){
  const books=libraryBooks(data),ids=librarySelectedIds(data),count=ids.length
  const label=count?`${count} ${count===1?"book":"books"} selected`:"Bring books together"
  const hint=count===0?"Choose books from any shelf or collection.":count===1?"Publish this book, or choose more to bring books together.":count===2?"Two books, ready for a new connection.":"A lateral uses two books. A corpus brings them all together."
  const covers=ids.slice(0,3).map((id,index)=>{const book=books.get(id);return `<i style="--cloth:${esc(book.cloth||"#536453")};--tilt:${(index-1)*5}deg">${book.cover_url?`<img src="${esc(book.cover_url)}" alt="" onerror="this.remove()">`:""}</i>`}).join("")
  return `${covers?`<span class="library-selection-covers" aria-hidden="true">${covers}</span>`:""}<div class="library-selection-copy" role="status" aria-live="polite"><strong>${label}</strong><span>${hint}</span></div><div class="library-selection-actions" aria-label="Selected book actions"><button type="button" data-library-selection-action="lateral" ${count===2?"":"disabled"} title="Choose exactly two books">Lateral</button><button type="button" data-library-selection-action="corpus" ${count>=2?"":"disabled"} title="Choose two or more books">Corpus</button><button type="button" data-library-selection-action="collection" ${count?"":"disabled"}>Make collection</button><button type="button" data-library-selection-action="publish_beta">Publish to beta</button>${count===1?'<button type="button" data-library-selection-action="update_beta_version">Update beta version</button>':""}${count?'<button type="button" data-library-selection-clear>Clear</button>':""}</div>`
}
function setupLibrarySelection(runtime){
  const root=runtime.root
  runtime.librarySelected=new Set();runtime.librarySelecting=false;runtime.librarySelectionPending=[]
  runtime.librarySelectionData=()=>({...runtime.data,selected_work_ids:[...runtime.librarySelected],library_selecting:runtime.librarySelecting})
  runtime.syncLibrarySelection=data=>{
    const ids=librarySelectedIds(data),signature=JSON.stringify(ids),revision=String(data?.selection_revision??"")
    if(runtime.librarySelectionRevision!==revision){
      runtime.librarySelected=new Set(ids);runtime.librarySelecting=ids.length>0;runtime.librarySelectionPending=[]
    }else if(signature!==runtime.librarySelectionServer){
      const acknowledged=runtime.librarySelectionPending.lastIndexOf(signature)
      if(acknowledged>=0)runtime.librarySelectionPending.splice(0,acknowledged+1)
      else if(!runtime.librarySelectionPending.length)runtime.librarySelected=new Set(ids)
    }
    const books=libraryBooks(data)
    runtime.librarySelected=new Set([...runtime.librarySelected].filter(id=>books.has(id)))
    runtime.librarySelectionRevision=revision;runtime.librarySelectionServer=signature
  }
  runtime.paintLibrarySelection=()=>{
    const data=runtime.librarySelectionData(),window=root.querySelector(".library-window")
    if(!window||!librarySelectionAvailable(data))return
    window.setAttribute("data-selecting",String(runtime.librarySelecting))
    const toggle=root.querySelector("[data-library-selection-toggle]"),tools=root.querySelector("[data-library-selection-tools]"),tray=root.querySelector("[data-library-selection-tray]")
    if(toggle){toggle.textContent=runtime.librarySelecting?"Done selecting":"Select books";toggle.setAttribute("aria-pressed",String(runtime.librarySelecting))}
    if(tools)tools.hidden=!runtime.librarySelecting
    if(tray){tray.hidden=!runtime.librarySelecting&&!runtime.librarySelected.size;const markup=librarySelectionTray(data);if(tray.innerHTML!==markup)tray.innerHTML=markup}
    const entries=new Map([...arr(data.books),...shelfLeaves(data.books)].map(book=>[String(book.id),book]))
    root.querySelectorAll("[data-library-select]").forEach(button=>{
      const book=entries.get(button.dataset.librarySelect);if(!book)return
      const checked=libraryCheckState(book,runtime.librarySelected),card=button.closest(".book-card")
      button.setAttribute("aria-checked",checked)
      button.querySelector("[data-selection-mark]")?.setAttribute("d",checked==="mixed"?"M6 10h8":checked==="true"?"m6 10 3 3 5-6":"")
      card?.classList.toggle("is-selected",checked==="true");card?.classList.toggle("is-part-selected",checked==="mixed")
      const open=card?.querySelector("[data-open-work]")
      open?.setAttribute("aria-label",`${runtime.librarySelecting?checked==="true"?"Deselect":"Select":"Study"}: ${book.title}`)
    })
    const visible=shelfSelection(data,runtime.shelf).items.flatMap(book=>isCollection(book)?arr(book.matching_work_ids):libraryMemberIds(book)),selectAll=root.querySelector("[data-library-select-visible]")
    if(selectAll){selectAll.disabled=!visible.length;selectAll.textContent=visible.length&&visible.every(id=>runtime.librarySelected.has(id))?"Deselect this shelf":"Select this shelf"}
    root.querySelectorAll("[data-library-selection-clear]").forEach(button=>button.disabled=!runtime.librarySelected.size)
  }
  runtime.emitLibrarySelection=(action,extra={})=>{
    const work_ids=[...runtime.librarySelected]
    if(action==="lateral"&&work_ids.length!==2||action==="corpus"&&work_ids.length<2||action==="collection"&&!work_ids.length)return false
    runtime.api?.setTriggerValue("library_selection",{action,work_ids,...extra,nonce:`${Date.now()}-${Math.random()}`});return true
  }
  runtime.setLibrarySelected=ids=>{
    const books=libraryBooks(runtime.data)
    runtime.librarySelected=new Set(ids.filter(id=>books.has(id)))
    runtime.librarySelectionPending.push(JSON.stringify([...runtime.librarySelected]))
    runtime.paintLibrarySelection();runtime.emitLibrarySelection("select")
  }
  runtime.onLibrarySelectionClick=event=>{
    const target=event.target
    const publish=target.closest("[data-library-selection-action=publish_beta]")
    if(publish&&runtime.data.library_selection_enabled){const scope=shelfScope(runtime.data);runtime.emitLibrarySelection("publish_beta",{publication_kind:scope==="dialogue"?"book":scope||"book"});return true}
    if(!librarySelectionAvailable(runtime.data))return false
    if(target.closest("[data-library-selection-toggle]")){runtime.librarySelecting=!runtime.librarySelecting;runtime.closeBookMenu();runtime.paintLibrarySelection();return true}
    if(target.closest("[data-library-selection-clear]")){runtime.setLibrarySelected([]);root.querySelector("[data-library-selection-toggle]")?.focus({preventScroll:true});return true}
    const action=target.closest("[data-library-selection-action]")
    if(action){if(!action.disabled)runtime.emitLibrarySelection(action.dataset.librarySelectionAction);return true}
    const edit=target.closest("[data-library-edit-collection]")
    if(edit){const group=arr(runtime.data.books).find(book=>String(book.id)===edit.dataset.libraryEditCollection&&book.user_collection);if(group)runtime.emitLibrarySelection("manage_collection",{group_id:String(group.id),work_ids:libraryMemberIds(group)});return true}
    let ids=[]
    if(target.closest("[data-library-select-visible]"))ids=shelfSelection(runtime.data,runtime.shelf).items.flatMap(book=>isCollection(book)?arr(book.matching_work_ids):libraryMemberIds(book))
    else{
      const select=target.closest("[data-library-select]"),open=runtime.librarySelecting?target.closest("[data-open-work]"):null
      if(!select&&!open)return false
      const id=select?.dataset.librarySelect||open?.dataset.openWork,book=[...arr(runtime.data.books),...shelfLeaves(runtime.data.books)].find(item=>String(item.id)===id)
      ids=book?libraryMemberIds(book):[]
    }
    if(ids.length){const selected=new Set(runtime.librarySelected),remove=ids.every(id=>selected.has(id));ids.forEach(id=>remove?selected.delete(id):selected.add(id));runtime.setLibrarySelected([...selected])}
    return true
  }
}
function shelfMatches(book,state,{ignoreQuery=false}={}){
  if(SHELF_FIELDS.some(([id])=>id===state.kind)&&book.field!==state.kind)return false
  if(["book","lecture","dialogue"].includes(state.kind)&&(isShelfField(book)||(book.content_kind||"book")!==state.kind))return false
  if(state.author&&book.author!==state.author&&!arr(book.author_names).includes(state.author))return false
  if(state.language&&book.language_code!==state.language&&!arr(book.languages).includes(state.language))return false
  if(state.layer==="source"&&!book.has_source&&!(isShelfField(book)&&arr(book.layers).includes("SOURCE")))return false
  if(state.layer==="unprocessed"&&(book.has_care||isShelfField(book)))return false
  if(state.layer&&!['source','unprocessed'].includes(state.layer)&&!arr(book.layers).includes(state.layer))return false
  const year=book.original_year
  if(state.era==="undated"&&year!=null)return false
  if(state.era&&state.era!=="undated"){
    if(year==null)return false
    if(state.era==="before1800"&&year>=1800)return false
    if(state.era==="1800"&&(year<1800||year>=1900))return false
    if(state.era==="1900"&&(year<1900||year>=2000))return false
    if(state.era==="2000"&&year<2000)return false
  }
  const terms=shelfText(state.query).trim().split(/\s+/).filter(Boolean)
  return ignoreQuery||terms.every(term=>shelfText([book.title,book.author,book.year,book.language_name,...(isShelfField(book)?[shelfFieldLabel(book.field),book.description,...arr(book.member_titles)]:[])].join(" ")).includes(term))
}
function shelfSelection(data,state){
  state=shelfStateFor(data,state)
  const scope=shelfScope(data),all=scope==='dialogue'?shelfLeaves(data?.books).filter(book=>book.content_kind==='dialogue'):scope?[]:arr(data?.books),collection=all.find(book=>String(book.id)===state.collection&&isCollection(book))
  const fields=arr(data?.fields).filter(book=>isShelfField(book)&&(!scope||book.field===scope))
  const base=collection?arr(collection.members):[...all,...fields]
  const selected=base.flatMap(book=>{
    if(!collection&&state.kind==="collection"&&!isCollection(book))return []
    if(!isCollection(book))return shelfMatches(book,state)?[book]:[]
    const groupMatches=shelfMatches({...book,content_kind:["lecture","dialogue"].includes(state.kind)?state.kind:"book"},{...state,author:"",language:"",layer:"",era:""})
    const members=shelfLeaves(book.members).filter(member=>shelfMatches(member,state,{ignoreQuery:groupMatches}))
    return members.length?[{...book,matching_members:members.length,matching_work_ids:libraryMemberIds({item_type:"collection",members})}]:[]
  })
  const textCompare=(a,b)=>shelfText(a).localeCompare(shelfText(b),undefined,{numeric:true})
  const missingLast=(a,b,descending=false)=>a==null||a===""?(b==null||b===""?0:1):(b==null||b===""?-1:(descending?-1:1)*(typeof a==="number"?a-b:textCompare(a,b)))
  selected.sort((a,b)=>{
    let order=0
    if(state.sort==="title-desc")order=-textCompare(a.title,b.title)
    if(state.sort==="author")order=textCompare(a.author,b.author)
    if(state.sort==="newest"||state.sort==="oldest")order=missingLast(a.original_year,b.original_year,state.sort==="newest")
    if(state.sort==="added"||state.sort==="visited"){const field=state.sort==="added"?"ingested_at":"last_visited_at";order=missingLast(a[field],b[field],true)}
    if(state.sort==="coverage")order=arr(b.layers).length-arr(a.layers).length||Number(b.care_units||0)-Number(a.care_units||0)
    if(state.sort==="collection"&&collection)return 0
    return order||textCompare(a.title,b.title)||textCompare(a.id,b.id)
  })
  return {items:selected,collection,base,total:new Set(shelfLeaves(all).map(book=>String(book.id))).size,fieldTotal:fields.length}
}
function fieldMemberCover(member,book){
  return `<span class="field-member-copy"><strong>${esc(member.title||book.title)}</strong><small>${esc(member.author||book.author||"")}</small></span>${member.cover_url?`<img src="${esc(member.cover_url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:""}`
}
function fieldSourceCover(book){
  const members=arr(book.members).slice(0,book.field==="lateral"?2:4)
  if(!members.length)members.push({title:book.title,author:book.author,cloth:book.cloth,foil:book.foil,cover_url:book.cover_url})
  const style=member=>`--cloth:${esc(member.cloth||book.cloth||"#2a2621")};--foil:${esc(member.foil||book.foil||"#eee7d6")}`
  if(book.field==="lateral"){
    while(members.length<2)members.push(members[members.length-1])
    return `<span class="book-cover field-split-cover" style="${style(book)}" aria-hidden="true">${members.map(member=>`<span class="field-source-half" style="${style(member)}">${fieldMemberCover(member,book)}</span>`).join("")}<svg class="field-split-seam" viewBox="0 0 2 3" preserveAspectRatio="none"><path d="M2 0L0 3"/></svg>${arr(book.layers).length?`<span class="field-cover-badge">${arr(book.layers).map(esc).join(" · ")}</span>`:""}</span>`
  }
  const count=Number(book.member_count||arr(book.members).length||0)
  while(members.length<4)members.push(members[members.length-1])
  return `<span class="book-cover field-stack-cover" style="${style(book)}" aria-hidden="true">${members.map(member=>`<span class="field-stack-book" style="${style(member)}">${fieldMemberCover(member,book)}</span>`).join("")}<span class="field-cover-badge">${count} ${count===1?"book":"books"}</span></span>`
}
function fieldShelfCard(book,data={}){
  const label=shelfFieldLabel(book.field),count=Number(book.member_count||arr(book.member_titles).length||0)
  const motifs={
    lateral:'<circle cx="36" cy="43" r="23"/><circle cx="64" cy="43" r="23"/><path d="M16 43h68M50 13v60"/>',
    corpus:'<path d="M22 25l28-12 28 12 10 32-38 26-38-26zM22 25l28 28 28-28M12 57l38-4 38 4M50 13v70"/><circle cx="50" cy="53" r="20"/>',
    numo:'<circle cx="50" cy="46" r="31"/><circle cx="50" cy="46" r="20"/><circle cx="50" cy="46" r="8"/><path d="M50 8v76M12 46h76"/>',
    living:'<path d="M49 79V24M49 54C17 52 16 27 16 27s32-5 33 27zM50 43C80 41 83 14 83 14S53 9 50 43zM49 69C25 66 24 49 24 49"/>',
    lateral_sea:'<path d="M5 25q15-17 30 0t30 0t30 0M5 40q15-17 30 0t30 0t30 0M5 55q15-17 30 0t30 0t30 0M5 70q15-17 30 0t30 0t30 0"/>',
    grimoire:'<circle cx="50" cy="46" r="34"/><circle cx="50" cy="46" r="29"/><path d="M50 15L77 62H23zM50 77L23 30h54z"/><circle cx="50" cy="46" r="9"/>'
  }
  const image=book.cover_url?`<img src="${esc(book.cover_url)}" alt="" loading="lazy" onerror="this.remove()">`:""
  const subtitle=book.author||(count?`${count} ${count===1?"source book":"source books"}`:"CARE library")
  const memberText=count?`${count} ${count===1?"source book":"source books"}`:""
  const cover=["lateral","corpus"].includes(book.field)?fieldSourceCover(book):`<span class="book-cover" style="--cloth:${esc(book.cloth||"#263239")};--foil:${esc(book.foil||"#f4e8cc")}"><span class="book-cover-fallback"><span class="field-cover-label">${esc(label)}</span><svg class="field-cover-art" viewBox="0 0 100 92" aria-hidden="true">${motifs[book.field]||motifs.corpus}</svg><strong>${esc(book.title)}</strong><small>${esc(subtitle)}</small></span>${image}</span>`
  const menu=data.library_selection_enabled&&["lateral","corpus"].includes(book.field)?shelfMenuToggle(book,"Reading options"):""
  return `<div class="book-card book-field" data-book-field="${esc(book.id)}"><button type="button" class="book-open" data-open-field="${esc(book.id)}" data-reading-title="${esc(book.title)}"${book.field==="corpus"?` data-corpus-covers="${esc(JSON.stringify(arr(book.members).map(member=>({title:member.title,cover_url:member.cover_url}))))}"`:""} aria-label="${esc(`Read ${label}: ${book.title}`)}"><span class="book-object">${cover}</span><span class="book-copy"><strong>${esc(book.title)}</strong>${book.author?`<span>${esc(book.author)}</span>`:""}${book.description?`<span class="field-description">${esc(book.description)}</span>`:""}${memberText?`<span class="field-members">${esc(memberText)}</span>`:""}<span class="book-layers"><b class="book-kind">${esc(label)}</b>${arr(book.layers).map(layer=>`<b>${esc(layer)}</b>`).join("")}</span></span></button>${menu}</div>`
}
function dialogueJacketTitle(book){
  const title=String(book.dialogue_cover?.title||book.title||"Untitled conversation")
  const names=[...new Set([...arr(book.author_names),...String(book.dialogue_cover?.author||book.author||"").split(/\s*·\s*/)].map(name=>name.trim().toLocaleLowerCase()).filter(name=>name.length>=3))].sort((a,b)=>b.length-a.length)
  const speakerCredit=text=>{
    let remaining=text.toLocaleLowerCase(),found=0
    names.forEach(name=>{if(remaining.includes(name)){found++;remaining=remaining.split(name).join(" ")}})
    return remaining.replace(/\b(and|with|in|conversation|debate|debates|versus|vs)\b/g,"").replace(/[^\p{L}\p{N}]/gu,"")?0:found
  }
  const subject=text=>{const value=text.trim();return value.charAt(0).toLocaleUpperCase()+value.slice(1)}
  // Only remove a recognised speaker credit. Subject wording and the complete
  // catalogue title remain intact; ambiguous subtitles keep the original.
  const split=title.match(/^(.+?)(?:\s*\|\s*|\s+[—–]\s+)(.+)$/)
  if(split&&speakerCredit(split[1])&&split[2].trim())return subject(split[2])
  for(const separator of [...title.matchAll(/[-—–]/g)].reverse()){
    const before=title.slice(0,separator.index).trim(),after=title.slice(separator.index+1)
    if(before&&speakerCredit(after)>=2)return subject(before)
  }
  return title
}
function dialogueBookCover(book){
  const cover=book.dialogue_cover||{},title=dialogueJacketTitle(book),author=String(cover.author||book.author||"Conversation")
  // Stable jacket colours keep a conversation recognisable after reordering.
  const palettes=["#193956","#243b59","#283351","#23474f"]
  const seed=Array.from(String(book.id||title)).reduce((total,letter)=>total+letter.codePointAt(0),0)
  const size=title.length>155 ? .48 : title.length>120 ? .54 : title.length>85 ? .6 : title.length>55 ? .68 : .9
  const image=cover.image_url?`<img src="${esc(cover.image_url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`:""
  return `<span class="book-cover dialogue-cover" style="--dialogue-cloth:${palettes[seed%palettes.length]};--dialogue-title-size:${size}rem" aria-hidden="true"><span class="dialogue-cover-label">Dialogue<svg viewBox="0 0 32 12"><path d="M1 6h4m3-3v6m4-8v10m4-7v4m4-6v8m4-7v6m3-3h4"/></svg></span><span class="dialogue-cover-image"><svg class="dialogue-voice-art" viewBox="0 0 160 90" aria-hidden="true"><path d="M30 62V31a22 22 0 1 1 36 16L46 69V47"/><path class="voice-secondary" d="M81 62V31a22 22 0 1 1 36 16L97 69V47"/><path d="M0 78C38 78 38 17 79 17s43 61 81 61" opacity=".24"/><path class="voice-secondary" d="M0 15c40 0 40 61 80 61s40-61 80-61" opacity=".4"/></svg>${image}</span><span class="dialogue-cover-copy"><strong class="dialogue-cover-title">${esc(title)}</strong><small class="dialogue-cover-author">${esc(author)}</small></span></span>`
}
function shelfMenuToggle(book,label="Book options"){
  return `<button type="button" class="book-menu-toggle" data-book-menu-toggle="${esc(book.id)}" aria-label="${esc(`Options for ${book.title}`)}" aria-haspopup="menu" aria-expanded="false" title="${esc(label)}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="16" cy="10" r="1.4"/></svg></button>`
}
function shelfCard(book,data={}){
  if(isShelfField(book))return fieldShelfCard(book,data)
  const collection=isCollection(book),count=arr(book.members).length,dialogue=!collection&&book.content_kind==="dialogue"
  const image=book.cover_url?`<img src="${esc(book.cover_url)}" alt="" loading="lazy" onerror="this.remove()">`:""
  const cover=dialogue&&!book.cover_url?dialogueBookCover(book):`<span class="book-cover" style="--cloth:${esc(book.cloth||"#263239")};--foil:${esc(book.foil||"#f4e8cc")}"><span class="book-cover-fallback"><i aria-hidden="true"></i><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></span>${image}</span>`
  const layers=arr(book.layers).map(layer=>`<b>${esc(layer)}</b>`).join("")
  const kind=collection?`${count} ${book.content_kind==="lecture"?"lectures":"volumes"}`:book.content_kind==="lecture"?"Lecture":book.content_kind==="dialogue"?"Dialogue":""
  const menu=collection?"":shelfMenuToggle(book,dialogue?"Dialogue options":"Book options")
  const canSelect=librarySelectionAvailable(data)&&libraryMemberIds(book).length>0,checked=libraryCheckState(book,new Set(librarySelectedIds(data)))
  const selection=canSelect?`<button type="button" class="book-selection" data-library-select="${esc(book.id)}" role="checkbox" aria-checked="${checked}" aria-label="${esc(collection?`Select all ${count} books in ${book.title}`:`Select ${book.title}`)}"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3"/><path data-selection-mark d="${checked==="mixed"?"M6 10h8":checked==="true"?"m6 10 3 3 5-6":""}"/></svg></button>`:""
  return `<div class="book-card ${collection?"book-collection":dialogue?"book-dialogue":""} ${canSelect&&checked==="true"?"is-selected":canSelect&&checked==="mixed"?"is-part-selected":""}" ${collection?"":`data-book-work="${esc(book.id)}"`}><button type="button" class="book-open" ${collection?"data-open-collection":"data-open-work"}="${esc(book.id)}" data-reading-title="${esc(book.title)}" aria-label="${esc(`${collection?"Open collection":"Study"}: ${book.title}${collection?`, ${kind}`:""}`)}"><span class="book-object">${cover}</span><span class="book-copy"><strong title="${esc(book.title)}">${esc(book.title)}</strong><span>${esc(book.author)}${book.year?` · ${esc(book.year)}`:""}</span><span class="book-layers">${kind?`<b class="book-kind">${esc(kind)}</b>`:""}${book.archived?'<b class="book-kind">Archived</b>':""}${layers}</span></span></button>${selection}${menu}</div>`
}
function setupBookMenu(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeBookMenu=({restoreFocus=false}={})=>{
    const current=runtime.bookMenu;if(!current)return
    runtime.bookMenu=null
    if(current.feedbackTimer)view?.clearTimeout(current.feedbackTimer)
    current.element.remove()
    current.card.classList.remove("menu-open")
    current.toggle?.setAttribute("aria-expanded","false")
    current.toggle?.removeAttribute("aria-controls")
    if(restoreFocus&&current.anchor?.isConnected!==false)current.anchor?.focus({preventScroll:true})
  }
  runtime.openBookMenu=(card,{anchor=null,x=null,y=null,last=false}={})=>{
    runtime.closeBookMenu()
    const fieldId=String(card?.dataset.bookField||""),workId=String(card?.dataset.bookWork||"")
    const book=fieldId?arr(runtime.data?.fields).find(item=>String(item.id)===fieldId&&["lateral","corpus"].includes(item.field)):shelfLeaves(runtime.data?.books).find(item=>String(item.id)===workId&&item.item_type!=="collection")
    if(!book||fieldId&&!runtime.data?.library_selection_enabled||!fieldId&&!workId)return false
    const toggle=card.querySelector("[data-book-menu-toggle]"),origin=anchor||card.querySelector(fieldId?"[data-open-field]":"[data-open-work]"),rect=(origin||card).getBoundingClientRect()
    const menu=doc.createElement("div");menu.className="book-context-menu";menu.id="care-book-context-menu";menu.setAttribute("data-book-context-menu","");menu.setAttribute("role","menu");menu.setAttribute("aria-label",`Options for ${book.title||"this book"}`)
    const actions=fieldId?[
      ["publish_beta","Publish / update beta",'<path d="M10 13V3m-4 4 4-4 4 4M3 12v5h14v-5"/>'],
      ...(book.field==="lateral"?[["field_rerun_latest","Re-run with latest book versions…",'<path d="M3 9a7 7 0 1 1 1 6M3 3v6h6"/>']]:[]),
      ["copy_title","Copy title",'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M4 13H3V3h10v1"/>'],
      ["field_archive","Archive",'<path d="M3 3h14v4H3zM4 7v10h12V7M8 10h4"/>'],
    ]:[["book_portrait","Book portrait",'<path d="M3 3h6v14H3zM11 3h6v14h-6z"/>'],["author_library","Author’s library",'<circle cx="10" cy="6" r="3"/><path d="M4 17c0-7 12-7 12 0"/>'],["book_info","Book info",'<circle cx="10" cy="10" r="7"/><path d="M10 9v5m0-8h.01"/>'],["translate_book","Translate book",'<path d="M2 4h10M7 2v2M4 4c0 5 5 7 7 8M10 4c0 5-5 7-8 8m9 5 4-10 4 10m-6-3h4"/>'],["restart_book","Start again from scratch",'<path d="M3 9a7 7 0 1 1 1 6M3 3v6h6"/>'],["copy_title","Copy title",'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M4 13H3V3h10v1"/>'],book.archived?["restore_book","Restore",'<path d="M4 7v10h12V7M3 3h14v4H3zM10 14V9m-2 2 2-2 2 2"/>']:["archive_book","Archive",'<path d="M3 3h14v4H3zM4 7v10h12V7M8 10h4"/>']]
    if(!fieldId&&runtime.data.library_selection_enabled&&libraryBooks(runtime.data).has(workId))actions.splice(3,0,["publish_beta","Publish to beta",'<path d="M10 13V3m-4 4 4-4 4 4M3 12v5h14v-5"/>'])
    if(!fieldId&&runtime.data.library_selection_enabled&&libraryBooks(runtime.data).has(workId))actions.splice(4,0,["update_beta_version","Update beta version",'<path d="M3 9a7 7 0 1 1 1 6M3 3v6h6"/>'])
    for(const [action,label,path] of actions){
      const button=doc.createElement("button");button.type="button";button.tabIndex=-1;button.setAttribute("role","menuitem");button.setAttribute("data-book-menu-action",action)
      const icon=doc.createElement("span");icon.className="book-menu-icon";icon.setAttribute("aria-hidden","true");icon.innerHTML=`<svg viewBox="0 0 20 20">${path}</svg>`
      const text=doc.createElement("span");text.setAttribute("data-book-menu-label","");text.textContent=label;button.append(icon,text);menu.append(button)
    }
    const status=doc.createElement("span");status.className="book-menu-status";status.setAttribute("role","status");menu.append(status)
    const current={element:menu,card,book,toggle,anchor:origin,status,feedbackTimer:null};runtime.bookMenu=current
    root.append(menu);card.classList.add("menu-open");toggle?.setAttribute("aria-expanded","true");toggle?.setAttribute("aria-controls",menu.id)
    const bounds=menu.getBoundingClientRect(),width=view?.innerWidth||doc.documentElement?.clientWidth||1024,height=view?.innerHeight||doc.documentElement?.clientHeight||768
    menu.style.left=`${Math.max(8,Math.min(x??rect.right-bounds.width,width-bounds.width-8))}px`
    menu.style.top=`${Math.max(8,Math.min(y??rect.bottom+4,height-bounds.height-8))}px`
    const items=[...menu.querySelectorAll("[role='menuitem']")],first=last?items.at(-1):items[0];first.tabIndex=0;first.focus({preventScroll:true})
    return true
  }
  runtime.copyBookTitle=async button=>{
    const current=runtime.bookMenu;if(!current)return
    const title=String(current.book.title||"");let copied=false
    try{if(!view?.navigator?.clipboard?.writeText)throw Error("Clipboard unavailable");await view.navigator.clipboard.writeText(title);copied=true}catch(_){
      const helper=doc.createElement("textarea");helper.value=title;helper.setAttribute("readonly","");helper.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";root.append(helper);helper.select()
      try{copied=Boolean(doc.execCommand("copy"))}catch(_){}finally{helper.remove();if(runtime.bookMenu===current)button.focus({preventScroll:true})}
    }
    if(runtime.bookMenu!==current)return
    const label=button.querySelector("[data-book-menu-label]"),message=copied?"Title copied":"Couldn’t copy title";label.textContent=message;current.status.textContent=message
    if(current.feedbackTimer)view?.clearTimeout(current.feedbackTimer)
    current.feedbackTimer=view?.setTimeout(()=>{if(runtime.bookMenu===current){label.textContent="Copy title";current.status.textContent=""}},1800)
  }
  runtime.activateBookMenu=button=>{
    const current=runtime.bookMenu,action=button?.dataset.bookMenuAction;if(!current||!action)return false
    if(action==="copy_title"){runtime.copyBookTitle(button);return true}
    if(isShelfField(current.book)){
      const field=current.book.field,field_id=String(current.book.id)
      if(!runtime.data.library_selection_enabled||!["lateral","corpus"].includes(field)||!arr(runtime.data.fields).some(item=>String(item.id)===field_id&&item.field===field))return false
      if(!["publish_beta","field_archive","field_rerun_latest"].includes(action)||action==="field_rerun_latest"&&field!=="lateral")return false
      runtime.closeBookMenu({restoreFocus:true})
      return runtime.emitLibrarySelection(action,action==="publish_beta"?{publication_kind:field,field_ids:[field_id],work_ids:[]}:{field_id,field,work_ids:[]})
    }
    if(["publish_beta","update_beta_version"].includes(action)){
      const work_id=String(current.book.id)
      if(!runtime.data.library_selection_enabled||!libraryBooks(runtime.data).has(work_id))return false
      runtime.closeBookMenu({restoreFocus:true})
      return runtime.emitLibrarySelection(action,{work_ids:[work_id],publication_kind:"book"})
    }
    if(!["book_info","translate_book","restart_book","archive_book","restore_book","book_portrait","author_library"].includes(action))return false
    const work_id=String(current.book.id);runtime.closeBookMenu({restoreFocus:true})
    runtime.api?.setTriggerValue("book_action",{action,work_id,nonce:`${Date.now()}-${Math.random()}`});return true
  }
  runtime.onBookMenuClick=event=>{
    const action=event.target?.closest?.("[data-book-menu-action]")
    if(action&&runtime.bookMenu?.element.contains(action)){event.preventDefault?.();event.stopPropagation?.();return runtime.activateBookMenu(action)}
    const toggle=event.target?.closest?.("[data-book-menu-toggle]");if(!toggle)return false
    event.preventDefault?.();event.stopPropagation?.()
    if(runtime.bookMenu?.toggle===toggle)runtime.closeBookMenu({restoreFocus:true})
    else runtime.openBookMenu(toggle.closest("[data-book-work]")||toggle.closest("[data-book-field]"),{anchor:toggle})
    return true
  }
  runtime.onBookContextMenu=event=>{
    const card=event.target?.closest?.("[data-book-work]")||event.target?.closest?.("[data-book-field]");if(!card)return
    if(runtime.openBookMenu(card,{anchor:card.querySelector("[data-open-work]")||card.querySelector("[data-open-field]"),x:event.clientX,y:event.clientY})){event.preventDefault();event.stopPropagation()}
  }
  runtime.onBookMenuKey=event=>{
    const current=runtime.bookMenu,key=event.key
    if(current){
      if(key==="Escape"){event.preventDefault();event.stopPropagation();runtime.closeBookMenu({restoreFocus:true});return true}
      if(key==="Tab"){runtime.closeBookMenu({restoreFocus:true});return true}
      if(current.element.contains(event.target)){
        const items=[...current.element.querySelectorAll("[role='menuitem']")],index=Math.max(0,items.indexOf(event.target.closest("[role='menuitem']")))
        if(["ArrowDown","ArrowUp","Home","End"].includes(key)){
          event.preventDefault();event.stopPropagation();const next=key==="Home"?0:key==="End"?items.length-1:(index+(key==="ArrowDown"?1:-1)+items.length)%items.length
          items.forEach((item,position)=>item.tabIndex=position===next?0:-1);items[next].focus({preventScroll:true});return true
        }
        if(["Enter"," "].includes(key)){event.preventDefault();event.stopPropagation();return runtime.activateBookMenu(items[index])}
        return true
      }
    }
    if(event.metaKey||event.ctrlKey||event.altKey||event.isComposing)return false
    const toggle=event.target?.closest?.("[data-book-menu-toggle]"),card=event.target?.closest?.("[data-book-work]")||event.target?.closest?.("[data-book-field]")
    if(card&&(key==="ContextMenu"||(event.shiftKey&&key==="F10")||(toggle&&["ArrowDown","ArrowUp"].includes(key)))){
      event.preventDefault();event.stopPropagation();return runtime.openBookMenu(card,{anchor:toggle||card.querySelector("[data-open-work]")||card.querySelector("[data-open-field]"),last:key==="ArrowUp"})
    }
    return false
  }
  runtime.onBookMenuOutside=event=>{
    const current=runtime.bookMenu;if(!current)return
    const path=event.composedPath?.()||[event.target]
    if(!path.includes(current.element)&&!path.includes(current.toggle)&&!current.element.contains(event.target))runtime.closeBookMenu()
  }
  runtime.onBookMenuScroll=event=>{if(runtime.bookMenu&&!event.target?.closest?.("[data-book-context-menu]"))runtime.closeBookMenu()}
  runtime.onBookMenuResize=()=>runtime.closeBookMenu()
}
function shelfHasFilters(state){return Boolean(state.query||state.author||state.language||state.layer||state.era)}
function shelfResults(data,state){
  state=shelfStateFor(data,state)
  const selection=shelfSelection(data,state),count=selection.items.length
  const fieldTab=SHELF_FIELDS.some(([id])=>id===state.kind),hasEntries=selection.total+selection.fieldTotal>0
  const label=state.kind==="dialogue"?`${count} ${count===1?"dialogue":"dialogues"}${shelfHasFilters(state)?` · ${selection.total} in your library`:""}`:selection.collection?`${count} of ${selection.base.length} volumes`:fieldTab?`${count} ${count===1?"reading":"readings"} · ${shelfFieldLabel(state.kind)}`:`${count} shelf ${count===1?"entry":"entries"} · ${selection.total} works${selection.fieldTotal?` · ${selection.fieldTotal} readings`:""}`
  const fieldEmpty=fieldTab&&!arr(data?.fields).some(field=>field.field===state.kind)
  return {selection,summary:`<span>${esc(label)}${state.kind==="collection"?" · Collections":""}</span>${shelfHasFilters(state)?'<button type="button" data-shelf-reset>Clear filters</button>':`<span>${state.kind==="dialogue"?"Follow a thought through different voices":selection.collection?"Choose a volume to begin":selection.fieldTotal?"Books, connections and their source routes":"Collections open to their own shelves"}</span>`}`,cards:selection.items.map(book=>shelfCard(book,data)).join("")||`<div class="library-empty"><strong>${fieldEmpty?`No ${esc(shelfFieldLabel(state.kind))} saved yet`:hasEntries?"No titles on this shelf":state.kind==="dialogue"?"Your dialogue shelf begins here":"Your library begins here"}</strong><p>${fieldEmpty?"Saved readings appear here, ready to open alongside their sources.":hasEntries?"Try another title, author, or combination of filters.":state.kind==="dialogue"?"Add a conversation to bring its voices into your library.":"Add a book to start your collection."}</p>${hasEntries&&!fieldEmpty?'<button type="button" data-shelf-reset>Clear filters</button>':""}</div>`}
}
function library(data,state=shelfDefaults()){
  state=shelfStateFor(data,state)
  const scope=shelfScope(data),all=scope==='dialogue'?shelfLeaves(data?.books).filter(book=>book.content_kind==='dialogue'):scope?arr(data?.fields).filter(book=>book.field===scope):[...shelfLeaves(data?.books),...arr(data?.fields)],result=shelfResults(data,state),collection=result.selection.collection
  const options=(pairs,value)=>pairs.map(([id,label])=>`<option value="${esc(id)}" ${id===value?"selected":""}>${esc(label)}</option>`).join("")
  const authors=[...new Set(all.flatMap(book=>[book.author,...arr(book.author_names)]).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
  const languages=[...new Map(all.map(book=>[book.language_code,book.language_name||book.language_code]).filter(([code])=>code)).entries()].sort((a,b)=>a[1].localeCompare(b[1]))
  const filterCount=[state.author,state.language,state.layer,state.era].filter(Boolean).length
  return `<div class="library-window" data-library-scope="${scope}" data-selecting="${librarySelectionAvailable(data)&&librarySelecting(data)}">${collection?`<header class="library-head"><div><button type="button" class="library-back" data-close-collection>← All library</button><h2>${esc(collection.title)}</h2></div>${collection.user_collection&&librarySelectionAvailable(data)?`<button type="button" class="library-edit-collection" data-library-edit-collection="${esc(collection.id)}">Edit collection</button>`:""}</header>`:""}<div class="library-toolbar"><div class="library-controls">${scope?"":`<div class="library-tabs" role="group" aria-label="Browse library">${SHELF_TABS.filter(([id])=>!collection||!["collection","lateral","corpus"].includes(id)).map(([id,label])=>`<button type="button" data-shelf-kind="${id}" class="${state.kind===id?"active":""}" aria-pressed="${state.kind===id}">${label}</button>`).join("")}</div>`}<div class="library-tools"><label class="library-search"><input type="search" data-shelf-input="query" aria-label="Find on this shelf" placeholder="Find a title or author…" value="${esc(state.query)}"></label><label class="library-sort"><span>Sort</span><select data-shelf-input="sort" aria-label="Sort library">${options(collection?[["collection","Collection order"],...SHELF_SORTS]:SHELF_SORTS,state.sort)}</select></label><button type="button" class="library-filter-toggle ${filterCount?"active":""}" data-shelf-filters aria-expanded="${state.filtersOpen}" aria-controls="shelf-filters">Filters${filterCount?` · ${filterCount}`:""}</button>${librarySelectionAvailable(data)?`<button type="button" class="library-select-toggle" data-library-selection-toggle aria-pressed="${librarySelecting(data)}">${librarySelecting(data)?"Done selecting":"Select books"}</button><button type="button" class="library-filter-toggle" data-library-selection-action="publish_beta">Publish to beta</button>`:""}${data.library_selection_enabled&&scope?'<button type="button" class="library-filter-toggle" data-library-selection-action="publish_beta">Publish to beta</button>':""}<button type="button" class="library-filter-toggle" data-portrait-open="directory">Books & thinkers</button><button type="button" class="library-archive" data-open-archive title="Open archived books"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h14v4H3zM4 7v10h12V7M8 10h4"/></svg><span>Archive</span></button></div></div>${librarySelectionAvailable(data)?`<div class="library-selection-tools" data-library-selection-tools ${librarySelecting(data)?"":"hidden"}><button type="button" data-library-select-visible>Select this shelf</button><button type="button" data-library-selection-clear>Clear selection</button><span>Open a collection to choose individual books.</span></div>`:""}<div class="library-filters" id="shelf-filters" ${state.filtersOpen?"":"hidden"}><label>Author<select data-shelf-input="author">${options([["","All authors"],...authors.map(author=>[author,author])],state.author)}</select></label><label>Language<select data-shelf-input="language">${options([["","All languages"],...languages],state.language)}</select></label><label>Available reading<select data-shelf-input="layer">${options([["","Any reading"],["source","Source text"],["CH","Chapter · CH"],["CL","Cluster · CL"],["MC","Macro · MC"],["WB","Whole book · WB"],["unprocessed","Awaiting CARE"]],state.layer)}</select></label><label>Year<select data-shelf-input="era" title="Original writing year">${options([["","All periods"],["before1800","Before 1800"],["1800","1800–1899"],["1900","1900–1999"],["2000","2000 onwards"],["undated","Undated"]],state.era)}</select></label></div></div><div class="library-summary" data-shelf-summary role="status" aria-live="polite">${result.summary}</div><div class="library-grid" data-shelf-grid>${result.cards}</div>${librarySelectionAvailable(data)?`<aside class="library-selection-tray" data-library-selection-tray aria-label="Selected books" ${librarySelecting(data)?"":"hidden"}>${librarySelectionTray(data)}</aside>`:""}</div>`
}
function centreSelectedReference(root,reference){
  if(!reference?.id)return false
  const card=root.querySelector(`.axiom-button[data-ref-id="${CSS.escape(String(reference.id))}"],.passage[data-ref-id="${CSS.escape(String(reference.id))}"],.route-source-card[data-ref-id="${CSS.escape(String(reference.id))}"]`)
  const pane=card?.closest("[data-pane]"),body=card?.closest(".window-body"),strip=root.querySelector("[data-strip]")
  if(!card||!pane||!body||!strip)return false
  const section=card.closest("details");if(section)section.open=true
  // Centre within the real content bounds. Extra end padding would leave a
  // half-screen of blank space when visiting the first or last pane.
  const sections=body.querySelector(".care-sections");if(sections)sections.style.paddingBottom=`${body.clientHeight/2}px`
  const paneRect=pane.getBoundingClientRect(),stripRect=strip.getBoundingClientRect()
  strip.scrollLeft+=paneRect.left+paneRect.width/2-stripRect.left-strip.clientWidth/2
  const text=card.querySelector(".axiom-text")||card.querySelector(".passage-text")||card,rect=text.getBoundingClientRect(),bodyRect=body.getBoundingClientRect()
  body.scrollTop+=rect.top+Math.min(rect.height,body.clientHeight*.8)/2-bodyRect.top-body.clientHeight/2
  return pane.dataset.pane
}
const routeCardScope=card=>card?.closest?.("[data-connection-source-pane]")?.dataset.connectionSourcePane||card?.closest?.("[data-connection-field]")?.dataset.connectionField||""
function paintRouteHover(runtime,event){
  const root=runtime.root,book=event.target?.closest?.('[data-connection-book]')?.dataset.connectionBook
  const reference=book?arr(runtime.data?.connection?.other_stacks).find(stack=>String(stack.work?.id)===book)?.reference:runtime.data?.connection?.reference||runtime.data?.reference
  if(!isRouteReference(reference))return
  const leaving=event.type==="pointerout"||event.type==="focusout",card=event.target?.closest?.("[data-ref-id]")
  if(leaving&&card?.contains?.(event.relatedTarget))return
  const id=leaving?"":card?.dataset.refId||"",scope=id?routeCardScope(card):""
  if(id===runtime.hoverReference&&scope===(runtime.hoverScope||""))return
  runtime.hoverReference=id;runtime.hoverScope=scope
  const key=(id,scope="")=>scope+"|"+id,related=new Set(exactRouteEdges(reference).filter(edge=>(String(edge.source_id)===id&&(!scope||edge.source_pane===scope))||(String(edge.target_id)===id&&(!scope||edge.target_pane===scope))).flatMap(edge=>[key(edge.source_id,edge.source_pane),key(edge.target_id,edge.target_pane)]))
  root.querySelectorAll(".route-card,.route-source-card,.axiom-button.route-feeder").forEach(card=>card.classList.toggle("route-related",related.has(key(card.dataset.refId,routeCardScope(card)))))
  root.querySelectorAll("[data-route-members]").forEach(group=>{group.style.opacity=!id||group.dataset.routeMembers.split("|").some(member=>related.has(key(member,group.dataset.routeScope||"")))?"1":".25"})
  runtime.queueThreads()
}
function drawRouteThreads(runtime){
  const root=runtime.root,reference=runtime.data?.reference,strip=root.querySelector("[data-strip]")
  let svg=root.querySelector("[data-route-threads]")
  if(!isRouteReference(reference)||!strip){svg?.remove();return}
  if(!svg){svg=root.ownerDocument.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("class","route-threads");svg.setAttribute("data-route-threads","");svg.setAttribute("aria-hidden","true");root.append(svg)}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),cards=new Map()
  root.querySelectorAll(".route-card[data-ref-id],.route-source-card[data-ref-id],.axiom-button[data-ref-id]").forEach(card=>{if(!card.closest("[data-connection-book],[data-connection-field]"))cards.set(card.dataset.refId,card)})
  const geometry=new Map(),edgeSlots=new Map()
  cards.forEach((card,id)=>{
    const rect=card.getBoundingClientRect(),body=card.closest(".window-body")?.getBoundingClientRect()
    if(!body||rect.width<=0||rect.height<=0||rect.right<=clip.left||rect.left>=clip.right)return
    const middle=rect.top+rect.height/2,offscreen=rect.bottom<=body.top+8?"above":rect.top>=body.bottom-8?"below":""
    let y=Math.max(body.top+10,Math.min(body.bottom-10,middle))
    if(offscreen){const key=`${body.left}|${offscreen}`,slot=edgeSlots.get(key)||0;edgeSlots.set(key,slot+1);const spread=Math.min(slot*6,Math.max(0,(body.bottom-body.top-20)/3));y=offscreen==="above"?body.top+8+spread:body.bottom-8-spread}
    geometry.set(id,{rect,body,y,offscreen,pane:card.closest("[data-pane]")})
  })
  const drawable=exactRouteEdges(reference).filter(edge=>{
    const from=geometry.get(String(edge.source_id)),to=geometry.get(String(edge.target_id))
    return from&&to&&!(from.offscreen&&to.offscreen)
  })
  const fullyVisible=edge=>!geometry.get(String(edge.source_id)).offscreen&&!geometry.get(String(edge.target_id)).offscreen
  const retained=new Set(displayRouteEdges(drawable.filter(fullyVisible),runtime.connectionView))
  const paths=drawable.filter(edge=>!fullyVisible(edge)||retained.has(edge)).map((edge,index)=>{
    const from=geometry.get(String(edge.source_id)),to=geometry.get(String(edge.target_id))
    if(!from||!to||(from.offscreen&&to.offscreen))return ""
    const samePane=from.pane===to.pane,a=from.rect,b=to.rect,forward=a.left<b.left
    const x1=(samePane?a.left+2:forward?a.right-3:a.left+3)-bounds.left,x2=(samePane?b.left+2:forward?b.left+3:b.right-3)-bounds.left
    const y1=from.y-bounds.top,y2=to.y-bounds.top,bend=Math.max(18,Math.abs(x2-x1)*.52),sign=forward?1:-1
    const color=layerColor(edge.source_layer,edge.source_id),targetColor=layerColor(edge.target_layer,edge.target_id),active=[String(edge.source_id),String(edge.target_id)].includes(runtime.hoverReference)
    return `<defs><linearGradient id="route-thread-${index}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop stop-color="${color}"/><stop offset="1" stop-color="${targetColor}"/></linearGradient></defs><path class="route-thread ${active?"active":""}" data-route-source="${esc(edge.source_id)}" data-route-target="${esc(edge.target_id)}" stroke="url(#route-thread-${index})" d="M ${x1} ${y1} C ${samePane?x1-15:x1+bend*sign} ${y1},${samePane?x2-15:x2-bend*sign} ${y2},${x2} ${y2}"/><circle class="route-port" cx="${x1}" cy="${y1}" r="${active?3.2:2.3}" stroke="${color}"/>${from.offscreen?`<path class="route-edge-continuation" stroke="${color}" d="M ${x1-2.5} ${y1+(from.offscreen==="above"?-4:4)} l 2.5 ${from.offscreen==="above"?-2.5:2.5} l 2.5 ${from.offscreen==="above"?2.5:-2.5}"/>`:""}<circle class="route-port" cx="${x2}" cy="${y2}" r="${active?3.2:2.3}" stroke="${targetColor}"/>`
  }).join("")
  svg.setAttribute("viewBox",`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=paths
}
function connectionThreadGeometry(a,b,ab,bb,bounds,clip,samePane=false){
  if(!ab||!bb||!a.width||!b.width||!ab.height||!bb.height)return null
  const visible=rect=>rect.right>clip.left&&rect.left<clip.right,sourceVisible=visible(a),targetVisible=visible(b)
  if(!sourceVisible&&!targetVisible)return null
  const forward=a.left<b.left,clampX=x=>Math.max(clip.left+2,Math.min(clip.right-2,x))-bounds.left
  const x1=clampX(samePane?a.left+3:forward?a.right-3:a.left+3),x2=clampX(samePane?b.left+3:forward?b.left+3:b.right-3)
  const y1=Math.max(ab.top+12,Math.min(ab.bottom-12,a.top+a.height/2))-bounds.top,y2=Math.max(bb.top+12,Math.min(bb.bottom-12,b.top+b.height/2))-bounds.top
  const bend=Math.max(18,Math.abs(x2-x1)*.52)*(forward?1:-1)
  // A feeder pane may contain several saved sheets. Its internal ancestry
  // stays beside the cards instead of crossing their text to the opposite edge.
  const gutter=clampX(Math.min(a.left,b.left)+3-18)
  const controlX1=samePane?gutter:x1+bend,controlX2=samePane?gutter:x2-bend
  return {x1,x2,y1,y2,bend,controlX1,controlX2,sourceVisible,targetVisible}
}
function drawConnectionThreads(runtime){
  const root=runtime.root,connection=runtime.data?.connection,strip=root.querySelector("[data-strip]")
  let svg=root.querySelector("[data-connection-threads]")
  const groups=[{reference:connection?.reference,kind:"field"},...arr(connection?.other_stacks).filter(stack=>stack.reference).map(stack=>({reference:stack.reference,kind:"book",workId:String(stack.work?.id||"")}))]
  if(!strip||!groups.some(group=>group.reference)){svg?.remove();return}
  if(!svg){svg=root.ownerDocument.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("class","route-threads");svg.setAttribute("data-connection-threads","");svg.setAttribute("aria-hidden","true");root.append(svg)}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect()
  const paths=groups.flatMap(group=>{
    const cards=new Map()
    root.querySelectorAll("[data-connection-field] [data-ref-id],[data-connection-book] [data-ref-id]").forEach(card=>{const pane=card.closest("[data-connection-field],[data-connection-book]");if(group.kind==="book"&&pane.dataset.connectionBook!==group.workId||group.kind==="field"&&!pane.dataset.connectionField)return;cards.set(`${group.kind==="field"?(card.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField):""}|${card.dataset.refId}`,card)})
    const drawable=exactRouteEdges(group.reference).map(edge=>{
      const source=cards.get(`${group.kind==="field"?edge.source_pane||"":""}|${edge.source_id}`),target=cards.get(`${group.kind==="field"?edge.target_pane||"":""}|${edge.target_id}`)
      if(!source||!target)return null
      const endpoint=card=>{const pane=card.closest("[data-pane]"),folded=pane?.classList.contains("care-pane-minimized");return {pane,folded,rect:folded?pane.getBoundingClientRect():card.getBoundingClientRect(),body:folded?pane.getBoundingClientRect():card.closest(".window-body")?.getBoundingClientRect()}}
      const from=endpoint(source),to=endpoint(target),a=from.rect,b=to.rect,ab=from.body,bb=to.body
      const geometry=connectionThreadGeometry(a,b,ab,bb,bounds,clip,Boolean(from.pane&&from.pane===to.pane))
      return geometry?{edge,geometry,reducible:geometry.sourceVisible&&geometry.targetVisible&&!from.folded&&!to.folded&&a.bottom>ab.top+8&&a.top<ab.bottom-8&&b.bottom>bb.top+8&&b.top<bb.bottom-8}:null
    }).filter(Boolean)
    const endpoint=(row,side)=>JSON.stringify([group.kind==="field"?row.edge[side+'_pane']||"":"",String(row.edge[side+'_id'])])
    const retained=new Set(displayRouteEdges(drawable.filter(row=>row.reducible),runtime.connectionView,endpoint))
    return drawable.filter(row=>!row.reducible||retained.has(row)).map(({edge,geometry})=>{
      const {x1,x2,y1,y2,controlX1,controlX2,sourceVisible,targetVisible}=geometry,color=layerColor(edge.source_layer,edge.source_id),active=(runtime.hoverReference===String(edge.source_id)&&(!runtime.hoverScope||runtime.hoverScope===edge.source_pane))||(runtime.hoverReference===String(edge.target_id)&&(!runtime.hoverScope||runtime.hoverScope===edge.target_pane))
      const port=(x,y,visible,layer,identity)=>visible?`<circle class="route-port" cx="${x}" cy="${y}" r="${active?3.2:2.3}" stroke="${layerColor(layer,identity)}"/>`:`<path class="route-thread" stroke="${layerColor(layer,identity)}" d="M ${x+(x<bounds.width/2?5:-5)} ${y-4} L ${x} ${y} L ${x+(x<bounds.width/2?5:-5)} ${y+4}"/>`
      return `<g><title>${esc(edge.source_id)} → ${esc(edge.target_id)}${!sourceVisible||!targetVisible?" · continue along the panes":""}</title><path class="route-thread${active?" active":""}" ${edge.collapsed||arr(edge.via).length?'stroke-dasharray="5 4"':""} stroke="${color}" d="M ${x1} ${y1} C ${controlX1} ${y1},${controlX2} ${y2},${x2} ${y2}"/>${port(x1,y1,sourceVisible,edge.source_layer,edge.source_id)}${port(x2,y2,targetVisible,edge.target_layer,edge.target_id)}</g>`

    })
  }).join("")
  svg.setAttribute("viewBox",`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=paths
}
function connectionViewportKey(connection){
  if(!connection?.id)return ""
  const reference=connection.reference||{}
  return JSON.stringify([connection.id,reference.id||"",reference.source_pane||"",connection.resolution||{},connection.hide_xa])
}
function centreConnectionPane(runtime,pane){
  const strip=runtime.root.querySelector("[data-strip]")
  if(!pane||!strip)return false
  const rect=pane.getBoundingClientRect(),bounds=strip.getBoundingClientRect(),desired=strip.scrollLeft+(rect.left+rect.width/2-bounds.left)/readerLayoutScale(strip,bounds)-strip.clientWidth/2
  const maximum=Number.isFinite(strip.scrollWidth)?Math.max(0,strip.scrollWidth-strip.clientWidth):Infinity
  strip.scrollLeft=Math.max(0,Math.min(maximum,desired))
  runtime.focused=pane.dataset.pane
  return true
}
function centreConnectionReference(runtime){
  const root=runtime.root,reference=runtime.data?.connection?.reference
  if(!reference?.id)return false
  const pane=root.querySelector(`[data-connection-field="${CSS.escape(reference.source_pane||runtime.data.connection.pane_id||"")}"]`),card=pane?.querySelector(`[data-ref-id="${CSS.escape(reference.id)}"]`),body=card?.closest(".window-body"),strip=root.querySelector("[data-strip]")
  if(!card||!body||!strip)return false
  const section=card.closest("details");if(section)section.open=true
  card.classList.add("selected")
  // Centre once on each axis. A smooth strip movement followed by
  // scrollIntoView let the browser race two different horizontal destinations.
  centreConnectionPane(runtime,pane)
  const text=card.querySelector(".axiom-text")||card,rect=text.getBoundingClientRect(),bodyRect=body.getBoundingClientRect()
  body.scrollTop+=rect.top+Math.min(rect.height,body.clientHeight*.8)/2-bodyRect.top-body.clientHeight/2
  runtime.focused=pane.dataset.pane
  return true
}
function setupConnectionReader(runtime){
  const root=runtime.root
  runtime.connectionAction=action=>runtime.api?.setTriggerValue("connection_action",action)
  runtime.connectionSelection=new Map()
  runtime.paintConnectionTabs=()=>{const tabs=root.querySelector(".connection-tab-rail .desk-tabs");if(!tabs)return;const before=root.querySelector('[data-connection-tabs-scroll="-1"]'),after=root.querySelector('[data-connection-tabs-scroll="1"]');if(before)before.disabled=tabs.scrollLeft<=1;if(after)after.disabled=tabs.scrollLeft>=tabs.scrollWidth-tabs.clientWidth-1}
  runtime.onConnectionTabsScroll=event=>{if(event.target?.matches?.(".connection-tab-rail .desk-tabs"))runtime.paintConnectionTabs()}
  runtime.connectionStack=input=>{const workId=input?.closest?.("[data-connection-book]")?.dataset?.connectionBook;return workId?arr(runtime.data?.connection?.other_stacks).find(stack=>String(stack.work?.id)===workId):null}
  const inBookContext=(input,callback)=>{const stack=runtime.connectionStack(input);if(!stack)return callback();const saved=runtime.data,api=runtime.api;runtime.data={...saved,stack,reference:stack.reference||null};runtime.api={...api,setTriggerValue:(kind,value)=>{if(["open_chapter","open_sheet"].includes(kind))api?.setTriggerValue("connection_action",{action:kind==="open_chapter"?"chapter":"sheet",work_id:String(stack.work?.id),id:String(value)});else if(kind==="set_route_mode")api?.setTriggerValue("connection_action",{action:"set_book_route_mode",work_id:String(stack.work?.id),mode:value});else api?.setTriggerValue(kind,value)}};try{return callback()}finally{runtime.data=saved;runtime.api=api}}
  for(const key of ["paintSlider","chooseSlider"]){const original=runtime[key];runtime[key]=(input,...args)=>inBookContext(input,()=>original(input,...args))}
  for(const key of ["onSliderInput","onSliderKey","onSliderClick","onRouteDirectionInput","onRouteDirectionChange","onSectionsClick"]){const original=runtime[key];runtime[key]=event=>inBookContext(event.target,()=>original(event))}
  runtime.paintConnectionSelection=()=>root.querySelectorAll("[data-connection-field],[data-connection-book]").forEach(pane=>{
    const server=runtime.data?.connection?.selection,selection=runtime.connectionSelection.get(pane.dataset.pane)||server
    pane.querySelectorAll("[data-select-axiom],[data-select-passage]").forEach(button=>{
      const source=button.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField,scope=selection&&(selection.pane_id?selection.pane_id===source:selection.work_id===pane.dataset.connectionBook),active=Boolean(scope&&(button.dataset.selectAxiom||button.dataset.selectPassage)===selection.reference_id)||button.dataset.connectionSelected==="true"
      button.classList.toggle("axiom-selected",active);button.setAttribute("aria-pressed",String(active));const route=button.parentElement.querySelector("[data-open-axiom-routes],[data-open-passage-routes]");if(route)route.hidden=!active
    })
  })
  const select=button=>{
    const pane=button.closest("[data-connection-field],[data-connection-book]"),id=button.dataset.selectAxiom||button.dataset.selectPassage,selection={pane_id:button.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField||"",work_id:pane.dataset.connectionBook||"",reference_id:id}
    runtime.connectionSelection.set(pane.dataset.pane,selection);runtime.paintConnectionSelection();button.focus({preventScroll:true})
    // The exact saved rows are already registered with the viewer. Inspection
    // remains entirely local; only an explicit Routes action rebuilds a graph.
    // A scoped acknowledgement prevents accidentally using a newer edition
    // with the same CARE ID. Fall back if the viewer has not mounted yet.
    const view=root.ownerDocument.defaultView,scope=selection.pane_id||(selection.work_id?`work:${selection.work_id}`:"")
    if(view?.CustomEvent){const event=new view.CustomEvent("care-reference-select",{cancelable:true,detail:{kind:button.dataset.selectPassage||pane.dataset.layer==="SOURCE"?"passage":"axiom",id,scope,open:false}});view.dispatchEvent(event);if(event.defaultPrevented)return}
    runtime.connectionAction({action:"select_axiom",...selection})
  }
  runtime.chooseConnectionLayer=(input,value)=>{
    const pane=input.closest("[data-pane]"),control=input.closest("[data-connection-layer-control]"),stops=[...control.querySelectorAll("[data-connection-layer-stop]")],index=Math.max(0,Math.min(stops.length-1,Number(value)||0)),stop=stops[index],source=stop.dataset.connectionLayerReading
    input.value=String(index);input.setAttribute("aria-valuetext",stop.dataset.connectionLayerLabel)
    control.querySelector("[data-connection-layer-title]").textContent=stop.dataset.connectionLayerLabel
    control.querySelector("[data-connection-layer-count]").textContent=index?`${index} / ${stops.length-1}`:`${stops.length-1} readings`
    stops.forEach((button,position)=>button.classList.toggle("active",position===index))
    pane.querySelectorAll("[data-connection-reading]").forEach(section=>{section.hidden=Boolean(source&&section.dataset.connectionReading!==source);if(!section.hidden)section.open=true})
    runtime.connectionLayerSelection=runtime.connectionLayerSelection||new Map();runtime.connectionLayerSelection.set(pane.dataset.pane,source)
    const body=pane.querySelector(".window-body");if(body)body.scrollTop=0
    runtime.queueThreads()
  }
  runtime.restoreConnectionLayers=()=>root.querySelectorAll("[data-connection-layer-slider]").forEach(input=>{const pane=input.closest("[data-pane]"),saved=runtime.connectionLayerSelection?.get(pane.dataset.pane);if(!saved)return;const stops=[...pane.querySelectorAll("[data-connection-layer-stop]")],index=stops.findIndex(stop=>stop.dataset.connectionLayerReading===saved);if(index>=0)runtime.chooseConnectionLayer(input,index)})
  const layerInput=runtime.onSliderInput;runtime.onSliderInput=event=>{const input=event.target.closest?.("[data-connection-layer-slider]");if(input){runtime.chooseConnectionLayer(input,input.value);return true}return layerInput(event)}
  runtime.onConnectionClick=event=>{
    const target=event.target
    if(target.closest?.('[data-dialogue-thinker-runs]')){
      if(!runtime.data?.dialogue_runs)return true
      runtime.closeReaderMenu?.({restoreFocus:true})
      runtime.connectionAction({action:'dialogue_thinkers',analysis_run_id:runtime.data.dialogue_runs.analysis_run_id||'',nonce:Date.now()+Math.random()})
      return true
    }
    const layerStop=target.closest?.("[data-connection-layer-stop]")
    if(layerStop){runtime.chooseConnectionLayer(layerStop.closest("[data-connection-layer-control]").querySelector("[data-connection-layer-slider]"),layerStop.dataset.connectionLayerStop);return true}
    const tabArrow=target.closest?.("[data-connection-tabs-scroll]")
    if(tabArrow){const tabs=root.querySelector(".connection-tab-rail .desk-tabs");tabs?.scrollBy({left:Number(tabArrow.dataset.connectionTabsScroll)*Math.max(120,tabs.clientWidth*.7),behavior:"smooth"});return true}
    const paneTab=target.closest?.("[data-pane-target]")
    if(paneTab?.dataset.paneTarget?.startsWith("connection:")){const pane=root.querySelector(`[data-pane="${CSS.escape(paneTab.dataset.paneTarget)}"]`);if(centreConnectionPane(runtime,pane))runtime.paintFocus();return true}
    if(target.closest?.("[data-connection-close]")){runtime.connectionAction({action:"close"});return true}
    if(target.closest?.("[data-connection-clear]")){runtime.connectionAction({action:"clear_reference"});return true}
    const routeHistory=target.closest?.("[data-connection-route-history]")
    if(routeHistory){const direction=Number(routeHistory.dataset.connectionRouteHistory);if(!routeHistory.disabled&&[-1,1].includes(direction)&&runtime.data?.connection?.reference)runtime.connectionAction({action:"navigate_route",direction});return true}
    const pane=target.closest?.("[data-connection-field],[data-connection-book]");if(!pane)return false
    const workId=pane.dataset.connectionBook,paneId=target.closest("[data-connection-source-pane]")?.dataset.connectionSourcePane||pane.dataset.connectionField
    if(target.closest("[data-sheet-sections]"))return false
    if(target.closest("[data-clear-reference]")){runtime.connectionAction(workId?{action:"clear_book_reference",work_id:workId}:{action:"clear_reference"});return true}
    if(target.closest("[data-route-direction-control]"))return true
    const selection=target.closest("[data-select-axiom],[data-select-passage]")
    if(selection){select(selection);return true}
    const button=target.closest("[data-open-axiom-routes],[data-open-passage-routes],[data-ref-id]")
    if(button?.dataset.connectionWholeSheet==="true")return true
    if(button&&!button.disabled&&!button.hidden){const id=button.dataset.openAxiomRoutes||button.dataset.openPassageRoutes||button.dataset.refId;runtime.connectionAction(workId?{action:"book_reference",work_id:workId,reference_id:id}:{action:"reference",pane_id:paneId,reference_id:id});return true}
    return false
  }
  const onClick=runtime.onClick;runtime.onClick=event=>{if(runtime.onConnectionClick(event))return;return onClick(event)}
  const onWheel=runtime.onWheel;runtime.onWheel=event=>{const tabs=event.target?.closest?.(".connection-tab-rail .desk-tabs");if(tabs&&tabs.scrollWidth>tabs.clientWidth+1&&!event.ctrlKey&&!event.metaKey){const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY,unit=event.deltaMode===1?16:event.deltaMode===2?tabs.clientWidth:1;tabs.scrollLeft=Math.max(0,Math.min(tabs.scrollWidth-tabs.clientWidth,tabs.scrollLeft+delta*unit));event.preventDefault();event.stopPropagation();runtime.paintConnectionTabs();return}return onWheel(event)}
  const onKey=runtime.onKey;runtime.onKey=event=>{
    const pane=event.target?.closest?.("[data-connection-field],[data-connection-book]")
    if(!pane)return onKey(event)
    if(event.target.closest?.("[data-connection-layer-slider]"))return
    const button=event.target.closest("[data-select-axiom],[data-select-passage]")
    if(button&&["ArrowUp","ArrowDown","Home","End"].includes(event.key)){const buttons=runtime.visibleAxioms(pane),index=buttons.indexOf(button),next=event.key==="Home"?0:event.key==="End"?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==="ArrowDown"?1:-1)));if(buttons[next]){event.preventDefault();select(buttons[next]);buttons[next].scrollIntoView({block:"nearest",inline:"nearest"})}return}
    if(["Enter"," "].includes(event.key)&&event.target.closest("[data-ref-id],[data-open-axiom-routes],[data-open-passage-routes],[data-clear-reference]")){event.preventDefault();runtime.onConnectionClick(event);return}
    if(runtime.onSliderKey(event))return
    if(["[","]"].includes(event.key)){event.preventDefault();runtime.step(event.key==="["?-1:1)}
  }
  runtime.onConnectionChange=event=>{const select=event.target?.closest?.("[data-connection-choice]");if(select?.value)runtime.connectionAction({action:"open",id:select.value})}
  const paintSelection=runtime.paintSelection;runtime.paintSelection=()=>{paintSelection();runtime.paintConnectionSelection()}
}
function setup(root){
  let savedTextScale=1
  try{savedTextScale=Number(root.ownerDocument.defaultView?.sessionStorage?.getItem(TEXT_SCALE_KEY)??1)}catch(_){}
  let savedSkin="care"
  try{
    const storage=root.ownerDocument.defaultView?.sessionStorage
    savedSkin=String(storage?.getItem(SKIN_KEY)||"")
    if(!savedSkin){const legacy=String(storage?.getItem(LEGACY_SKIN_KEY)||"");savedSkin=["library","classic"].includes(legacy)?legacy:"care"}
  }catch(_){}
  if(!["care","library","classic"].includes(savedSkin))savedSkin="care"
  const runtime={root,api:null,data:null,signature:"",referenceId:"",scrollTimer:null,loadTimer:null,focused:"source",skin:savedSkin,textScaleIndex:Math.max(0,Math.min(TEXT_SCALES.length-1,Number.isFinite(savedTextScale)?savedTextScale:1))}
  setupBookMenu(runtime)
  // Reading selection stays local when the viewer has the exact card.
  // Server state is a fallback for a viewer that has not loaded the card yet.
  runtime.selectedAxiom=null
  // The desk renders before the viewer during a book switch. Reapply a saved
  // browser selection once the viewer has registered the destination's cards.
  runtime.onViewerReady=()=>{
    if(!runtime.viewerSelectionPending||!root.isConnected)return
    const selection=runtime.selectedAxiom,view=root.ownerDocument.defaultView
    if(!selection||selection.work_id!==runtime.workId||!view?.CustomEvent)return
    if(runtime.isRouting()&&selection.route_root_id!==runtime.referenceId)return
    const event=new view.CustomEvent("care-reference-select",{cancelable:true,detail:{kind:selection.passage_id?"passage":"axiom",id:selection.passage_id||selection.axiom_id,scope:runtime.data?.viewer_scopes?.[selection.passage_id||selection.axiom_id]||"",open:false}})
    view.dispatchEvent(event)
    if(event.defaultPrevented)runtime.viewerSelectionPending=false
  }
  runtime.sectionMemory=new Map()
  runtime.sliderScrollPositions=new Map()
  runtime.isRouting=()=>isRouteReference(runtime.data?.reference)
  runtime.readingPassageVisible=button=>!button.closest("[hidden]")&&(root.dataset.beautifulText!=="true"||button.dataset.beautifulFolded===undefined)
  runtime.readingPassageTarget=button=>{
    if(!button?.dataset.selectPassage||root.dataset.beautifulText!=="true"||button.dataset.beautifulFolded===undefined||runtime.isRouting())return button
    const passages=[...(button.closest('[data-pane]')?.querySelectorAll('[data-select-passage]')||[])],index=passages.indexOf(button),visible=candidate=>!candidate.disabled&&runtime.readingPassageVisible(candidate)
    return index<0?null:passages.slice(index+1).find(visible)||passages.slice(0,index).reverse().find(visible)||null
  }
  runtime.visibleAxioms=pane=>[...pane.querySelectorAll("[data-select-axiom],[data-select-passage]")].filter(button=>!button.disabled&&runtime.readingPassageVisible(button)&&(button.closest("details")?button.closest("details").open:Boolean(button.dataset.selectPassage||runtime.isRouting())))
  runtime.paintSelection=()=>{
    if(runtime.isRouting()){
      const selection=runtime.selectedAxiom?.route_root_id===runtime.referenceId?runtime.selectedAxiom:null
      root.querySelectorAll("[data-pane]").forEach(pane=>{
        const buttons=runtime.visibleAxioms(pane),matches=button=>Boolean(selection&&(button.dataset.selectAxiom||button.dataset.selectPassage)===(selection.axiom_id||selection.passage_id)&&(button.dataset.selectionUnit||button.dataset.sourceUnit||pane.dataset.pane)===selection.unit_id),tabStop=buttons.find(matches)||buttons[0]
        pane.querySelectorAll("[data-select-axiom],[data-select-passage]").forEach(button=>{const active=matches(button);button.classList.toggle("axiom-selected",active);button.setAttribute("aria-pressed",String(active));button.tabIndex=button===tabStop?0:-1;const routes=button.parentElement.querySelector("[data-open-axiom-routes],[data-open-passage-routes]");if(routes)routes.hidden=!active})
      })
      return
    }
    root.querySelectorAll("[data-reading-sheet]").forEach(pane=>{
      const visible=runtime.visibleAxioms(pane),selected=visible.find(button=>button.dataset.selectAxiom===runtime.selectedAxiom?.axiom_id&&(button.dataset.selectionUnit||pane.dataset.pane)===runtime.selectedAxiom?.unit_id),tabStop=selected||visible[0]
      pane.querySelectorAll("[data-select-axiom]").forEach(button=>{
        const active=button.dataset.selectAxiom===runtime.selectedAxiom?.axiom_id&&(button.dataset.selectionUnit||pane.dataset.pane)===runtime.selectedAxiom?.unit_id
        button.classList.toggle("axiom-selected",active)
        button.setAttribute("aria-pressed",String(active))
        button.tabIndex=button===tabStop?0:-1
        const routes=button.parentElement.querySelector("[data-open-axiom-routes]")
        if(routes)routes.hidden=!active
      })
    })
    const passages=[...root.querySelectorAll("[data-select-passage]")],selected=passages.find(button=>button.dataset.selectPassage===runtime.selectedAxiom?.passage_id&&button.dataset.sourceUnit===runtime.selectedAxiom?.unit_id)
    const visiblePassages=passages.filter(runtime.readingPassageVisible),passageTab=visiblePassages.find(button=>button===selected)||visiblePassages[0]
    passages.forEach(button=>{
      const active=button===selected
      button.classList.toggle("selected",active)
      button.setAttribute("aria-pressed",String(active))
      button.tabIndex=button===passageTab?0:-1
      const routes=button.parentElement.querySelector("[data-open-passage-routes]")
      if(routes)routes.hidden=!active
    })
  }
  runtime.openPreparedReference=id=>{if(!studyNavigationChoose(runtime,"ROUTE",id))runtime.api?.setTriggerValue("open_reference",id)}
  runtime.selectAxiom=button=>{
    if(!button||button.disabled)return
    const requested=button
    button=runtime.readingPassageTarget(button)
    if(!button||button.disabled)return
    const routing=runtime.isRouting()
    const passage=Boolean(button.dataset.selectPassage)
    if(!passage&&(!routing||button.closest("details"))&&!button.closest("details")?.open)return
    const pane=button.closest(passage||routing?"[data-pane]":"[data-reading-sheet]")
    if(!pane)return
    const selection={work_id:String(runtime.data?.stack?.work?.id||""),unit_id:button.dataset.selectionUnit||(passage?button.dataset.sourceUnit:pane.dataset.pane),...(passage?{passage_id:button.dataset.selectPassage}:{axiom_id:button.dataset.selectAxiom}),...(routing?{route_root_id:runtime.referenceId}: {})}
    const changed=JSON.stringify(selection)!==JSON.stringify(runtime.selectedAxiom)
    runtime.selectedAxiom=selection
    if(!routing)runtime.originalDeskChapter?.(runtime.data?.stack?.active_raw_unit_id)
    runtime.paintSelection()
    studyNavigationPrioritizeRoute(runtime,selection.passage_id||selection.axiom_id)
    button.focus({preventScroll:true})
    if(button!==requested)button.scrollIntoView({block:"nearest",inline:"nearest",behavior:"auto"})
    const view=root.ownerDocument.defaultView
    if(view?.CustomEvent){
      const event=new view.CustomEvent("care-reference-select",{cancelable:true,detail:{kind:passage?"passage":"axiom",id:selection.passage_id||selection.axiom_id,scope:runtime.data?.viewer_scopes?.[selection.passage_id||selection.axiom_id]||"",open:false}})
      view.dispatchEvent(event)
      if(event.defaultPrevented){runtime.viewerSelectionPending=false;return}
    }
    if(changed)runtime.api?.setStateValue("selected_axiom",selection)
  }
  runtime.onSelectionKey=event=>{
    const button=event.target?.closest?.("[data-select-axiom],[data-select-passage]")
    if(!button||button.disabled)return false
    if(["Enter"," "].includes(event.key)){event.preventDefault();runtime.selectAxiom(button);return true}
    if(!["ArrowUp","ArrowDown","Home","End"].includes(event.key))return false
    const pane=button.closest(button.dataset.selectPassage||runtime.isRouting()?"[data-pane]":"[data-reading-sheet]"),buttons=runtime.visibleAxioms(pane),index=buttons.indexOf(button)
    if(index<0)return false
    event.preventDefault()
    const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==="ArrowDown"?1:-1)))
    runtime.selectAxiom(buttons[next])
    buttons[next].scrollIntoView({block:"nearest",inline:"nearest",behavior:"auto"})
    return true
  }
  runtime.rememberSections=pane=>runtime.sectionMemory.set(pane.dataset.pane,[...pane.querySelectorAll(".care-section")].map(section=>section.open))
  runtime.onSectionsClick=event=>{
    if(runtime.isRouting())return false
    const button=event.target?.closest?.("[data-sheet-sections]"),pane=button?.closest("[data-reading-sheet]")
    if(!pane)return false
    button.focus({preventScroll:true})
    pane.querySelectorAll(".care-section").forEach(section=>{section.open=button.dataset.sheetSections==="expand"})
    runtime.rememberSections(pane);runtime.paintSelection()
    return true
  }
  runtime.onSectionToggle=event=>{
    if(root.dataset.view==="outline"){runtime.captureOutline?.();runtime.paintSelection();return}
    if(runtime.isRouting())return
    const section=event.target,pane=section?.closest?.("[data-reading-sheet]")
    if(!pane||!section.matches(".care-section"))return
    // Never move focus from a collapse control, an editor, or another section.
    if(!section.open&&section.querySelector(":focus"))section.querySelector("summary")?.focus({preventScroll:true})
    runtime.rememberSections(pane);runtime.paintSelection()
  }
  runtime.shelf=shelfDefaults()
  setupLibrarySelection(runtime)
  // Reading destinations start fresh; only the sort order is a preference.
  try{const saved=JSON.parse(root.ownerDocument.defaultView?.sessionStorage?.getItem(SHELF_STATE_KEY)||"{}");if(SHELF_SORTS.some(([id])=>id===saved.sort))runtime.shelf.sort=saved.sort}catch(_){}
  runtime.syncShelf=data=>{
    const signature=JSON.stringify([shelfScope(data),data?.shelf_request||""])
    if(runtime.shelfSignature===signature)return false
    runtime.shelfSignature=signature
    const sort=SHELF_SORTS.some(([id])=>id===runtime.shelf.sort)?runtime.shelf.sort:"title"
    runtime.shelf={...shelfDefaults(shelfScope(data)),sort}
    return true
  }
  runtime.saveShelf=()=>{try{root.ownerDocument.defaultView?.sessionStorage?.setItem(SHELF_STATE_KEY,JSON.stringify(runtime.shelf))}catch(_){}}
  runtime.paintShelfControls=()=>{
    root.querySelectorAll("[data-shelf-kind]").forEach(button=>{const active=button.dataset.shelfKind===runtime.shelf.kind;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))})
    const filterCount=[runtime.shelf.author,runtime.shelf.language,runtime.shelf.layer,runtime.shelf.era].filter(Boolean).length,toggle=root.querySelector("[data-shelf-filters]")
    if(toggle){toggle.textContent=`Filters${filterCount?` · ${filterCount}`:""}`;toggle.classList.toggle("active",filterCount>0);toggle.setAttribute("aria-expanded",String(runtime.shelf.filtersOpen))}
    const filters=root.querySelector(".library-filters");if(filters)filters.hidden=!runtime.shelf.filtersOpen
  }
  runtime.paintShelf=(full=false)=>{
    runtime.closeBookMenu()
    runtime.saveShelf()
    if(full){root.innerHTML=library(runtime.librarySelectionData(),runtime.shelf);runtime.applySkin();runtime.paintLibrarySelection();return}
    const result=shelfResults(runtime.librarySelectionData(),runtime.shelf),grid=root.querySelector("[data-shelf-grid]"),summary=root.querySelector("[data-shelf-summary]")
    if(grid)grid.innerHTML=result.cards
    if(summary)summary.innerHTML=result.summary
    runtime.paintShelfControls()
    runtime.paintLibrarySelection()
  }
  runtime.onShelfInput=event=>{const input=event.target.closest?.("[data-shelf-input]");if(!input||!["query","sort","author","language","layer","era"].includes(input.dataset.shelfInput)||runtime.shelf[input.dataset.shelfInput]===input.value)return;runtime.shelf[input.dataset.shelfInput]=input.value;runtime.paintShelf()}
  runtime.listen=(node,event,handler,options)=>{node.addEventListener(event,handler,options)}
  runtime.onRouteDirectionInput=event=>{
    const input=event.target?.closest?.("[data-route-direction]")
    if(!input||!routeCanMove(runtime.data?.reference))return
    const mode=ROUTE_MODES[sliderIndex(input.value,3)],control=input.closest("[data-route-direction-control]")
    input.setAttribute("aria-valuetext",routeModeLabel(mode))
    // The dot responds during dragging; commit the exact graph on release.
    const preview=routeArrival(runtime.data.reference,mode),svg=control?.querySelector("svg")
    if(svg)svg.outerHTML=preview.match(/<svg[\s\S]*?<\/svg>/)?.[0]||svg.outerHTML
  }
  runtime.onRouteDirectionChange=event=>{
    const input=event.target?.closest?.("[data-route-direction]")
    if(!input||!routeCanMove(runtime.data?.reference))return
    const mode=ROUTE_MODES[sliderIndex(input.value,3)]
    if(mode!==routeMode(runtime.data.reference))runtime.api?.setTriggerValue("set_route_mode",mode)
  }
  runtime.onClick=event=>{
    if(portraitMenuAction(runtime,event))return
    if(runtime.onOriginalClick?.(event))return
    if(runtime.onBookMenuClick(event))return
    if(runtime.onLibrarySelectionClick(event))return
    if(event.target?.closest?.("[data-route-direction-control]"))return
    if(runtime.onSectionsClick(event))return
    const select=event.target.closest("[data-select-axiom],[data-select-passage]")
    if(select){runtime.selectAxiom(select);return}
    const routes=event.target.closest("[data-open-axiom-routes],[data-open-passage-routes]")
    if(routes&&!routes.hidden){runtime.openPreparedReference(routes.dataset.openPassageRoutes||routes.dataset.openAxiomRoutes);return}
    if(runtime.onSliderClick?.(event))return
    const collection=event.target.closest("[data-open-collection]");if(collection){runtime.shelf={...shelfDefaults(),kind:"all",collection:collection.dataset.openCollection,sort:"collection"};runtime.paintShelf(true);root.querySelector(".library-back")?.focus();return}
    const closeCollection=event.target.closest("[data-close-collection]");if(closeCollection){const previous=runtime.shelf.collection;runtime.shelf={...shelfDefaults()};runtime.paintShelf(true);root.querySelector(`[data-open-collection="${CSS.escape(previous)}"]`)?.focus();return}
    const kind=event.target.closest("[data-shelf-kind]");if(kind){if(runtime.shelf.kind!==kind.dataset.shelfKind){runtime.shelf.kind=kind.dataset.shelfKind;runtime.paintShelf()}return}
    const archive=event.target.closest("[data-open-archive]");if(archive){runtime.api?.setTriggerValue("open_archive",true);return}
    const filters=event.target.closest("[data-shelf-filters]");if(filters){runtime.closeBookMenu();runtime.shelf.filtersOpen=!runtime.shelf.filtersOpen;runtime.saveShelf();runtime.paintShelfControls();return}
    const reset=event.target.closest("[data-shelf-reset]");if(reset){runtime.shelf={...shelfDefaults(shelfScope(runtime.data)),kind:runtime.shelf.kind,sort:runtime.shelf.sort,collection:runtime.shelf.collection,filtersOpen:runtime.shelf.filtersOpen};runtime.paintShelf(true);root.querySelector("[data-shelf-input='query']")?.focus();return}
    const field=event.target.closest("[data-open-field]");if(field){runtime.api?.setTriggerValue("open_field",String(field.dataset.openField));return}
    const work=event.target.closest("[data-open-work]");if(work){runtime.api?.setTriggerValue("open_work",work.dataset.openWork);return}
    const chapter=event.target.closest("[data-chapter-id]");if(chapter){runtime.originalDeskChapter?.(chapter.dataset.chapterId);if(!studyNavigationChoose(runtime,"SOURCE",chapter.dataset.chapterId))runtime.api?.setTriggerValue("open_chapter",chapter.dataset.chapterId);return}
    const routeHistory=event.target.closest("[data-route-history]");if(routeHistory){const direction=Number(routeHistory.dataset.routeHistory);if(!routeHistory.disabled&&[-1,1].includes(direction))runtime.api?.setTriggerValue("navigate_route",direction);return}
    const clear=event.target.closest("[data-clear-reference]");if(clear){runtime.api?.setTriggerValue("clear_reference",true);return}
    const reference=event.target.closest("[data-ref-id]");if(reference&&!reference.disabled){const id=String(reference.dataset.refId||"");if(id&&id===runtime.referenceId)runtime.api?.setTriggerValue("clear_reference",true);else runtime.openPreparedReference(id);return}
    const rate=event.target.closest("[data-rate]");if(rate){runtime.api?.setTriggerValue("rate",{id:rate.dataset.rateId,score:Number(rate.dataset.rate)});return}
    const skin=event.target.closest("[data-skin-value]");if(skin){runtime.skin=["care","library","classic"].includes(skin.dataset.skinValue)?skin.dataset.skinValue:"care";try{root.ownerDocument.defaultView?.sessionStorage?.setItem(SKIN_KEY,runtime.skin)}catch(_){};runtime.applySkin();return}
    const textSize=event.target.closest("[data-text-size]");if(textSize){runtime.textScaleIndex=Math.max(0,Math.min(TEXT_SCALES.length-1,runtime.textScaleIndex+Number(textSize.dataset.textSize||0)));try{root.ownerDocument.defaultView?.sessionStorage?.setItem(TEXT_SCALE_KEY,String(runtime.textScaleIndex))}catch(_){};runtime.applyTextScale();return}
    const pane=event.target.closest("[data-pane-target]");if(pane){runtime.focus(pane.dataset.paneTarget);return}
    const step=event.target.closest("[data-step]");if(step){runtime.step(Number(step.dataset.step));return}
  }
  runtime.paintSlider=(input,position)=>{
    const options=sliderOptions(runtime.data?.stack,input.dataset.sheetSlider),index=sliderIndex(position,options.length),option=options[index]
    if(!option)return
    const title=sliderTitle(option),control=input.closest?.("[data-slider-control]")
    input.value=String(sliderPosition(position,options.length))
    input.setAttribute?.("aria-valuetext",`${title} · ${index+1} of ${options.length}`)
    if(control){
      const heading=control.querySelector("[data-slider-title]"),count=control.querySelector("[data-slider-count]")
      if(heading){heading.textContent=title;heading.title=title}
      if(count)count.textContent=`${index+1} / ${options.length}`
      // Long books have over a thousand stops. A drag changes only two dots;
      // rewriting every stop on every pointer event stalls the reading line.
      const previous=control.querySelector("[data-slider-stop].active"),next=control.querySelector(`[data-slider-stop="${index}"]`)
      if(previous!==next){
        if(previous){previous.classList.toggle("active",false);previous.setAttribute("aria-pressed","false");previous.tabIndex=-1}
        if(next){next.classList.toggle("active",true);next.setAttribute("aria-pressed","true");next.tabIndex=0}
      }
    }
    paintSliderHeading(input,option,index)
    keepSliderVisible(input)
  }
  runtime.chooseSlider=(input,position)=>{
    if(!input||input.disabled||runtime.isRouting())return
    const layer=input.dataset.sheetSlider,options=sliderOptions(runtime.data?.stack,layer),index=sliderIndex(position,options.length),option=options[index]
    if(!option)return
    runtime.paintSlider(input,index)
    if(layer==="ORIGINAL"){runtime.sliderJumpFocus=null;runtime.originalGo?.(option.id);return}
    const activeUnit=arr(runtime.data?.stack?.care_path).find(unit=>sheetLayerKey(unit)===layer||(!unit.reader_slot&&unit.type===layer)),active=layer==="SOURCE"?runtime.data?.stack?.active_raw_unit_id:activeUnit?.reader_option_id||activeUnit?.id
    if(String(option.id)===String(active))return
    const destination=`${layer}:${option.id}`
    if(runtime.pendingSlider===destination)return
    runtime.pendingSlider=destination
    runtime.pendingLayer=layer
    runtime.originalDeskChapter?.(layer==="SOURCE"?option.id:option.raw_unit_id)
    if(studyNavigationChoose(runtime,layer,String(option.id)))return
    root.setAttribute("aria-busy","true")
    runtime.api?.setTriggerValue(layer==="SOURCE"?"open_chapter":"open_sheet",String(option.id))
  }
  runtime.onSliderStart=event=>{
    const input=event.target.closest?.('[data-sheet-slider]')
    if(input&&!input.disabled&&!runtime.isRouting())runtime.sliderGesture=input
  }
  runtime.onSliderEnd=event=>{
    const input=runtime.sliderGesture
    if(!input)return
    runtime.sliderGesture=null
    if(event.type!=='pointercancel')runtime.chooseSlider(input,input.value)
    studyNavigationSchedule(runtime)
    studyNavigationPrefetch(runtime)
  }
  runtime.onSliderInput=event=>{
    const input=event.target.closest?.("[data-sheet-slider]")
    if(!input||input.disabled||runtime.isRouting())return
    const options=sliderOptions(runtime.data?.stack,input.dataset.sheetSlider)
    runtime.paintSlider(input,sliderMagneticPosition(input.value,options.length))
    if(runtime.sliderGesture===input&&studyNavigationEligible(runtime.data)){
      const option=options[sliderIndex(input.value,options.length)]
      const request=option&&studyNavigationRequest(runtime,input.dataset.sheetSlider,option.id,runtime.data.stack.active_raw_unit_id)
      // Draw exact prepared readings during the gesture; send only its final
      // destination when released. Cold destinations retain the live preview.
      if(request&&studyNavigationSnapshot(runtime,request))runtime.chooseSlider(input,input.value)
    }
  }
  runtime.onSliderChange=event=>{
    const input=event.target.closest?.("[data-sheet-slider]")
    if(input)runtime.chooseSlider(input,input.value)
  }
  runtime.onSliderClick=event=>{
    const stop=event.target.closest?.("[data-slider-stop]")
    if(!stop)return false
    const input=stop.closest("[data-slider-control]")?.querySelector("[data-sheet-slider]")
    if(!input||runtime.isRouting())return true
    input.focus({preventScroll:true})
    runtime.chooseSlider(input,stop.dataset.sliderStop)
    return true
  }
  runtime.onSliderKey=event=>{
    if(event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return false
    const stop=event.target.closest?.("[data-slider-stop]"),input=event.target.closest?.("[data-sheet-slider]")||stop?.closest("[data-slider-control]")?.querySelector("[data-sheet-slider]")
    if(!input)return false
    const options=sliderOptions(runtime.data?.stack,input.dataset.sheetSlider),moves={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}
    let position
    if(event.key in moves)position=sliderIndex(input.value,options.length)+moves[event.key]
    else if(event.key==="Home"||event.key==="End")position=event.key==="Home"?0:options.length-1
    else return false
    event.preventDefault()
    if(stop)input.focus({preventScroll:true})
    runtime.chooseSlider(input,position)
    return true
  }
  runtime.onSliderWheel=event=>{
    if(event.ctrlKey||event.metaKey)return false
    const track=event.target.closest?.("[data-slider-track]")
    if(!track||track.scrollWidth<=track.clientWidth+2||(!event.shiftKey&&Math.abs(event.deltaX)<=Math.abs(event.deltaY)))return false
    const delta=event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX,unit=event.deltaMode===1?16:event.deltaMode===2?track.clientWidth:1
    track.scrollLeft=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,track.scrollLeft+delta*unit))
    event.preventDefault();event.stopPropagation()
    return true
  }
  runtime.rememberSliders=()=>root.querySelectorAll("[data-sheet-slider]").forEach(input=>{
    const track=input.closest("[data-slider-track]")
    if(track)runtime.sliderScrollPositions.set(sliderMemoryKey(input),track.scrollLeft)
  })
  runtime.refreshSliders=(scope=root)=>scope.querySelectorAll("[data-sheet-slider]").forEach(input=>{
    const track=input.closest("[data-slider-track]"),saved=runtime.sliderScrollPositions.get(sliderMemoryKey(input))
    if(track&&saved!==undefined)track.scrollLeft=saved
    runtime.paintSlider(input,input.value)
  })
  runtime.onKey=event=>{
    if(runtime.onBookMenuKey(event))return
    if(event.target?.closest?.("[data-route-direction]"))return
    if(event.defaultPrevented||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.target?.isContentEditable||event.target?.closest?.('textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||event.target?.matches?.("input:not([data-sheet-slider])"))return
    if(runtime.onSelectionKey(event))return
    if(runtime.onSliderKey?.(event))return;if(event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.target?.matches?.("input,textarea,select"))return;const reference=event.target?.closest?.("[data-ref-id]");if(reference&&!reference.disabled&&["Enter"," "].includes(event.key)){event.preventDefault();const id=String(reference.dataset.refId||"");if(id&&id===runtime.referenceId)runtime.api?.setTriggerValue("clear_reference",true);else runtime.openPreparedReference(id);return}const movement={"[":-1,"]":1}[event.key];if(movement){event.preventDefault();runtime.step(movement)}
  }
  runtime.focus=id=>{
    const strip=root.querySelector("[data-strip]"),target=root.querySelector(`[data-pane="${CSS.escape(id)}"]`)
    if(!strip||!target)return
    const view=root.ownerDocument.defaultView
    if(runtime.scrollTimer)view?.clearTimeout(runtime.scrollTimer)
    runtime.scrollTimer=null
    runtime.focused=id
    const rect=target.getBoundingClientRect(),bounds=strip.getBoundingClientRect()
    // A tab is a discrete destination. Keep its selection through the scroll
    // event, including where the viewport cannot centre a pane near an edge.
    strip.scrollTo({left:Math.max(0,strip.scrollLeft+(rect.left+rect.width/2-bounds.left)/readerLayoutScale(strip,bounds)-strip.clientWidth/2),behavior:"instant"})
    runtime.focusScrollLeft=strip.scrollLeft
    runtime.paintFocus()
  }
  runtime.step=direction=>{const panes=[...root.querySelectorAll("[data-pane]")].filter(pane=>!pane.hidden);if(!panes.length)return;let index=Math.max(0,panes.findIndex(pane=>pane.dataset.pane===runtime.focused));index=Math.max(0,Math.min(panes.length-1,index+direction));runtime.focus(panes[index].dataset.pane)}
  runtime.nearest=()=>{
    const strip=root.querySelector("[data-strip]"),panes=[...root.querySelectorAll("[data-pane]")].filter(pane=>!pane.hidden)
    if(!strip||!panes.length)return "source"
    // Edge panes align to the content edge, so they need not be nearest the
    // viewport centre. Keep their tab selected when the strip reaches an end.
    const maxLeft=strip.scrollWidth-strip.clientWidth
    if(maxLeft>1){
      if(strip.scrollLeft<=1)return panes[0].dataset.pane
      if(strip.scrollLeft>=maxLeft-1)return panes.at(-1).dataset.pane
    }
    const stripBounds=strip.getBoundingClientRect(),centre=stripBounds.left+(stripBounds.width||strip.clientWidth)/2
    let id=panes[0].dataset.pane,distance=Infinity
    panes.forEach(pane=>{const rect=pane.getBoundingClientRect(),next=Math.abs(rect.left+rect.width/2-centre);if(next<distance){distance=next;id=pane.dataset.pane}})
    return id
  }
  runtime.paintFocus=()=>{root.querySelectorAll("[data-pane]").forEach(pane=>pane.classList.toggle("pane-focused",pane.dataset.pane===runtime.focused));root.querySelectorAll("[data-pane-target]").forEach(tab=>{const active=tab.dataset.paneTarget===runtime.focused;tab.classList.toggle("active",active);tab.setAttribute("aria-current",String(active))});const label=root.querySelector("[data-focus-label]");const pane=root.querySelector(`[data-pane="${CSS.escape(runtime.focused)}"]`);if(label)label.textContent=`FOCUS · ${(pane?.querySelector(`.window-titlebar .reader-${root.dataset.titleView==="true"?"simple":"full"}-title`)||pane?.querySelector(".window-titlebar strong"))?.textContent||runtime.focused}`}
  runtime.applySkin=()=>{root.dataset.skin=runtime.skin;root.querySelectorAll("[data-skin-value]").forEach(button=>{const active=button.dataset.skinValue===runtime.skin;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))})}
  runtime.applyTextScale=()=>{root.style.setProperty("--desk-text-scale",String(TEXT_SCALES[runtime.textScaleIndex]));root.querySelectorAll("[data-text-size]").forEach(button=>{const direction=Number(button.dataset.textSize||0);button.disabled=(direction<0&&runtime.textScaleIndex===0)||(direction>0&&runtime.textScaleIndex===TEXT_SCALES.length-1)})}
  runtime.onScroll=()=>{
    const view=root.ownerDocument.defaultView,strip=root.querySelector("[data-strip]");if(!view||!strip)return
    if(runtime.scrollTimer)view.clearTimeout(runtime.scrollTimer)
    runtime.scrollTimer=null
    if(runtime.focusScrollLeft!=null&&Math.abs(strip.scrollLeft-runtime.focusScrollLeft)<1)return
    runtime.focusScrollLeft=null
    runtime.scrollTimer=view.setTimeout(()=>{runtime.scrollTimer=null;runtime.focused=runtime.nearest();runtime.paintFocus()},90)
  }
  runtime.onWheel=event=>{
    if(event.target?.closest?.(".desk-menu-panel"))return
    if(runtime.onSliderWheel?.(event))return
    if(event.ctrlKey||event.metaKey||event.target?.closest?.("[data-sheet-slider]"))return
    const strip=root.querySelector("[data-strip]");if(!strip)return
    const body=event.target?.closest?.(".window-body")
    const unit=event.deltaMode===1?16:event.deltaMode===2?(body?.clientHeight||strip.clientHeight):1
    const sideways=event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)
    if(sideways){
      const delta=event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX
      if(!delta)return
      strip.scrollLeft=Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,strip.scrollLeft+delta*unit))
      event.preventDefault();event.stopPropagation();return
    }
    // Native vertical scrolling preserves trackpad momentum and avoids layout
    // reads/writes for every wheel event. Pane CSS contains vertical overscroll.
  }
  runtime.queueThreads=()=>{if(!runtime.isRouting()&&!runtime.data?.connection?.reference&&!arr(runtime.data?.connection?.other_stacks).some(stack=>stack.reference))return;const view=root.ownerDocument.defaultView;if(!view||runtime.threadFrame)return;runtime.threadFrame=view.requestAnimationFrame(()=>{runtime.threadFrame=null;if(runtime.readerView==="outline"&&root.dataset.view==="outline")drawOutlineThreads(runtime);else drawRouteThreads(runtime);drawConnectionThreads(runtime)})}
  runtime.onRouteHover=event=>{
    paintRouteHover(runtime,event)
    if(event.type==='pointerover'||event.type==='focusin'){
      const button=event.target?.closest?.('[data-select-axiom],[data-select-passage],[data-open-axiom-routes],[data-open-passage-routes],[data-ref-id]')
      if(button)studyNavigationPrioritizeRoute(runtime,button.dataset.selectAxiom||button.dataset.selectPassage||button.dataset.openAxiomRoutes||button.dataset.openPassageRoutes||button.dataset.refId)
    }
  }
  setupConnectionReader(runtime)
  setupConnectionResolution(runtime)
  setupConnectionDiscovery(runtime)
  setupVersionControls(runtime)
  setupBuildVersionMenu(runtime)
  setupSheetVersionMenu(runtime)
  setupPaneBookmarks(runtime)
  setupAxiomFavourites(runtime)
  setupTrackZoom(runtime)
  setupOutlineView(runtime)
  setupDialoguePlayer(runtime)
  setupSliderJumpMenu(runtime)
  setupOriginalReader(runtime)
  setupOriginalAnnotations(runtime)
  setupOriginalDownloads(runtime)
  setupOriginalFormats(runtime)
  setupReaderMenus(runtime)
  setupConnectionView(runtime)
  return runtime
}

const workspaceSnapshots = new Map()
const WORKSPACE_READER_PREFIX = 'care-corpus-workspace-reader-v2:'
function workspaceSnapshotSlot(workId, connectionId = '') { return connectionId ? workId + '|connection:' + connectionId : workId }
function workspaceReaderKey(workId, connectionId = '') { return WORKSPACE_READER_PREFIX + encodeURIComponent(workspaceSnapshotSlot(workId,connectionId)) }
function workspaceReadSnapshot(root, workId, signature, referenceId, context = '', connectionId = '') {
  if (!workId) return null
  let saved = workspaceSnapshots.get(workspaceSnapshotSlot(workId,connectionId + '|context:' + context))
  if (!saved) {
    try { saved = JSON.parse(root.ownerDocument.defaultView?.localStorage?.getItem(workspaceReaderKey(workId,connectionId + '|context:' + context)) || 'null') } catch (_) {}
  }
  if (!saved || saved.version !== 1 || saved.workId !== workId || saved.signature !== signature || saved.referenceId !== referenceId || (saved.context || '') !== context) return null
  return saved
}
function workspaceCheckpoint(runtime) {
  if (runtime.root.dataset?.view === 'outline') return
  const root = runtime.root, strip = root.querySelector('[data-strip]')
  // React may call cleanup after detaching the old host. Detached scroll boxes
  // report zero; never let teardown overwrite the last live reading position.
  if (!runtime.workId || !strip || !root.isConnected || !strip.clientWidth || !strip.clientHeight) return
  const positions = [...root.querySelectorAll('.desk-window[data-pane]')].map(pane => {
    const body = pane.querySelector('.window-body')
    return [pane.dataset.pane, {readingId:body?.dataset.readingId || '', top:body?.scrollTop || 0, left:body?.scrollLeft || 0,
      sections:[...pane.querySelectorAll('.care-section')].map(section=>section.open)}]
  })
  const saved = {version:1, workId:runtime.workId, signature:runtime.signature, referenceId:runtime.referenceId, context:runtime.workspaceContentContext ?? runtime.data?.workspace_context ?? '',
    focused:runtime.focused, left:strip.scrollLeft, skin:runtime.skin, textScaleIndex:runtime.textScaleIndex,
    positions, selectedAxiom:runtime.selectedAxiom, sections:[...runtime.sectionMemory],
    bookPosition:runtime.bookPosition ? {...runtime.bookPosition,positions:[...runtime.bookPosition.positions]} : null}
  const connectionId = (runtime.data?.connection?.id || '') + '|context:' + (runtime.workspaceContentContext ?? runtime.data?.workspace_context ?? '')
  workspaceSnapshots.set(workspaceSnapshotSlot(runtime.workId,connectionId), saved)
  try { root.ownerDocument.defaultView?.localStorage?.setItem(workspaceReaderKey(runtime.workId,connectionId), JSON.stringify(saved)) } catch (_) {}
}
function workspaceRestoreRuntime(runtime, saved) {
  if (!saved) return
  const pairs = value => Array.isArray(value) ? value.filter(row=>Array.isArray(row)&&row.length===2&&typeof row[0]==='string') : []
  runtime.sectionMemory = new Map(pairs(saved.sections))
  runtime.selectedAxiom = saved.selectedAxiom?.work_id === runtime.data?.stack?.work?.id ? saved.selectedAxiom : null
  runtime.bookPosition = saved.bookPosition ? {...saved.bookPosition,positions:new Map(pairs(saved.bookPosition.positions))} : null
  if (['care','library','classic'].includes(saved.skin)) runtime.skin = saved.skin
  if (Number.isInteger(saved.textScaleIndex)) runtime.textScaleIndex = Math.max(0,Math.min(TEXT_SCALES.length-1,saved.textScaleIndex))
}
function workspaceRestorePosition(runtime, saved) {
  if (!saved) return
  const root = runtime.root
  const number = value => Number.isFinite(value) ? Math.max(0,value) : 0
  for (const row of Array.isArray(saved.positions) ? saved.positions : []) {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || !row[1]) continue
    const [id, position] = row, pane = root.querySelector(`[data-pane="${CSS.escape(id)}"]`), body = pane?.querySelector('.window-body')
    // Original editions restore a page/section before loading nearby assets;
    // an old whole-book pixel offset would clamp to the end of placeholders.
    if (id === 'original') continue
    if (!body || (position.readingId && body.dataset.readingId !== position.readingId)) continue
    if (Array.isArray(position.sections)) pane.querySelectorAll('.care-section').forEach((section,index)=>{if(typeof position.sections[index]==='boolean')section.open=position.sections[index]})
    body.scrollTop = number(position.top); body.scrollLeft = number(position.left)
  }
  const strip = root.querySelector('[data-strip]')
  if (strip) strip.scrollLeft = number(saved.left)
  if (typeof saved.focused === 'string' && root.querySelector(`[data-pane="${CSS.escape(saved.focused)}"]`)) runtime.focused = saved.focused
  runtime.paintSelection(); runtime.paintFocus(); runtime.queueThreads()
}
function workspaceWatchReader(runtime) {
  const root = runtime.root, view = root.ownerDocument.defaultView
  if (!view) return () => {}
  let timer = null
  const flush = () => { if (timer) view.clearTimeout(timer); timer = null; workspaceCheckpoint(runtime) }
  const queue = () => { if (timer) view.clearTimeout(timer); timer = view.setTimeout(flush,120) }
  // Only a pending reading change needs saving before an outside click. A
  // document-wide unconditional checkpoint made every shell button scan the
  // whole desk and synchronously write browser storage before handling input.
  const beforeNavigation = event => {
    if (timer !== null && !event.composedPath().includes(root)) flush()
  }
  // Local writes avoid server reruns while scrolling and survive refresh/crash.
  for (const event of ['scroll','toggle','click','keyup']) root.addEventListener(event,queue,true)
  view.addEventListener('pagehide',flush)
  view.addEventListener('care-workspace-checkpoint',flush)
  root.ownerDocument.addEventListener('pointerdown',beforeNavigation,true)
  const visibility = () => { if (root.ownerDocument.visibilityState === 'hidden') flush() }
  root.ownerDocument.addEventListener('visibilitychange',visibility)
  return () => {
    flush()
    for (const event of ['scroll','toggle','click','keyup']) root.removeEventListener(event,queue,true)
    view.removeEventListener('pagehide',flush)
    view.removeEventListener('care-workspace-checkpoint',flush)
    root.ownerDocument.removeEventListener('pointerdown',beforeNavigation,true)
    root.ownerDocument.removeEventListener('visibilitychange',visibility)
  }
}
function workspaceFitReader(runtime) {
  if (!runtime.data?.workspace_managed) return () => {}
  const root = runtime.root, host = root.getRootNode()?.host, view = root.ownerDocument.defaultView
  if (!host) return () => {}
  // The canonical desk has a viewport-based height. Its containing workspace
  // supplies the available height; only this outer boundary needs adjustment.
  const fit = () => {
    const height = host.clientHeight
    if (height > 0) { root.style.height = height + 'px'; root.style.maxHeight = height + 'px' }
  }
  fit()
  const observer = view?.ResizeObserver ? new view.ResizeObserver(fit) : null
  observer?.observe(host)
  return () => observer?.disconnect()
}


const resolutionDepthOrder=["WB","MC","CL","CH","SOURCE"]
const resolutionLayerColour=layer=>({DIRECT:"#a895be",WB:"#9a4327",MC:"#594f88",CL:"#2d6b67",CH:"#3d668b",SOURCE:"#8a431d",CB:"#a96624",XR:"#6e4f9a",XS:"#8b4f86",SC:"#8f394b"})[layer]||"#a895be"
function resolutionUnitTitle(unit){
  const id=String(unit.unit_id||""),macro=id.match(/^MC_.+_L(\d+)_(\d+)$/),numbered=id.match(/^(CL|CH)_.+_(\d+)$/)
  if(macro)return `Level ${Number(macro[1])} · Reading ${Number(macro[2])}`
  if(numbered)return `${numbered[1]} ${Number(numbered[2])}`
  if(unit.title&&unit.title!==unit.work_title)return unit.title
  if(id.startsWith("MC_"))return id.slice(3).toLowerCase().replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())
  return unit.title||id
}
function resolutionStops(reference){const available=new Set(arr(reference?.resolution_choices?.units).map(unit=>unit.layer));return ["DIRECT",...resolutionDepthOrder.filter(layer=>available.has(layer))]}
function resolutionForDepth(reference,stop){
  if(stop==="DIRECT")return {mode:"immediate"}
  if(stop==="SOURCE")return {mode:"full"}
  const depth=resolutionDepthOrder.indexOf(stop),available=new Set(arr(reference?.resolution_choices?.units).map(unit=>unit.layer))
  return {mode:"selected",layers:[...available].filter(layer=>!resolutionDepthOrder.includes(layer)||resolutionDepthOrder.indexOf(layer)<=depth),pane_ids:[]}
}
function resolutionDepthIndex(reference,resolution){
  const stops=resolutionStops(reference);if(resolution?.mode==="full")return stops.length-1
  if(resolution?.mode!=="selected")return 0
  if(arr(resolution.pane_ids).length)return -1
  return stops.findIndex(stop=>{const candidate=resolutionForDepth(reference,stop);return candidate.mode==="selected"&&JSON.stringify([...candidate.layers].sort())===JSON.stringify([...arr(resolution.layers)].sort())})
}
function connectionResolutionControl(data){
  const reference=data?.connection?.reference;if(!reference)return ""
  const resolution=data.connection.resolution||{},index=resolutionDepthIndex(reference,resolution),stop=resolutionStops(reference)[index],label=resolution.mode==="full"?"Full path":index<0?"Selected readings":stop&&stop!=="DIRECT"?`To ${stop}`:"Direct inputs"
  return `<button type="button" class="desk-action" data-connection-resolution aria-haspopup="dialog" title="Choose layers and individual readings along this route">Resolution · ${label}</button>`
}
function setupConnectionResolution(runtime){
  const root=runtime.root
  runtime.closeConnectionResolution=()=>{root.querySelector(".connection-resolution-panel")?.remove()}
  runtime.openConnectionResolution=()=>{
    runtime.closeConnectionResolution()
    runtime.beforeResolutionOpen?.()
    const connection=runtime.data?.connection,reference=connection?.reference;if(!reference)return
    const choices=reference.resolution_choices||{},units=arr(choices.units).filter(unit=>connection.hide_xa===false||unit.layer!=="XA"),layers=[...new Set(units.map(unit=>unit.layer))].sort((a,b)=>["SC","XS","XR","CB","WB","MC","CL","CH","SOURCE"].indexOf(a)-["SC","XS","XR","CB","WB","MC","CL","CH","SOURCE"].indexOf(b)),resolution=connection.resolution||{},visible=new Set(Object.values(reference.route_layers||{}).flatMap(arr).map(item=>item.source_pane)),explicit=new Set(arr(resolution.pane_ids)),selected=unit=>resolution.mode==="full"||explicit.has(unit.id)||arr(resolution.layers).includes(unit.layer)||(resolution.mode!=="selected"&&visible.has(unit.id))
    const element=root.ownerDocument.createElement("section");element.className="connection-resolution-panel";element.setAttribute("role","dialog");element.setAttribute("aria-label","Route resolution")
    const stops=resolutionStops(reference),depth=resolutionDepthIndex(reference,resolution),current=Math.max(0,depth),stopLabel=stop=>stop==="DIRECT"?"Direct inputs":stop==="SOURCE"?"Full path to source":`Through ${stop}`,missing=resolutionDepthOrder.filter(layer=>!stops.includes(layer))
    element.innerHTML=`<header><h3>${connection.overview?'Reading resolution':'Route resolution'}</h3><button type="button" data-resolution-close aria-label="Close route resolution">×</button></header><p>${connection.overview?'Choose the reading depth for both books, or select each book’s layers below.':'Move toward the source to unfold the route on either side. Only the readings behind this axiom appear.'}</p><div class="resolution-depth" style="--resolution-accent:${resolutionLayerColour(stops[current])};--resolution-gradient:linear-gradient(90deg,${stops.map(resolutionLayerColour).join(",")})"><div class="resolution-depth-heading"><span>Reading depth</span><output data-resolution-depth-label>${depth<0?"Selected readings":stopLabel(stops[current])}</output></div><div class="resolution-depth-rail"><input type="range" data-resolution-depth min="0" max="${stops.length-1}" step="1" value="${current}" aria-label="Route depth" aria-valuetext="${esc(stopLabel(stops[current]))}" ${stops.length<2?"disabled":""}><div class="resolution-depth-stops">${stops.map((stop,index)=>`<button type="button" class="resolution-depth-stop" data-resolution-stop="${esc(stop)}" style="--stop-color:${resolutionLayerColour(stop)}" aria-current="${index===depth}" title="${esc(stopLabel(stop))}"><span>${stop==="DIRECT"?"Direct":stop==="SOURCE"?"Source":stop}</span></button>`).join("")}</div></div></div>${missing.length?`<p class="resolution-availability">No saved ${missing.join(" / ")} ${missing.length===1?"layer":"layers"} on this route.</p>`:""}${runtime.resolutionExtras?.()||''}<details class="resolution-custom" ${depth<0?"open":""}><summary>Choose individual layers & readings</summary><div class="resolution-custom-actions"><button type="button" data-resolution-clear>Clear selection</button></div>${layers.map(layer=>`<details><summary><span class="resolution-unit-title" style="--stop-color:${resolutionLayerColour(layer)}"><i></i>${esc(layer)} <small>${units.filter(unit=>unit.layer===layer).length}</small></span><button type="button" data-resolution-layer="${esc(layer)}">Select layer</button></summary>${units.filter(unit=>unit.layer===layer).map(unit=>`<label><input type="checkbox" data-resolution-unit="${esc(unit.id)}" data-resolution-unit-layer="${esc(layer)}" ${selected(unit)?"checked":""}><span><b>${esc(resolutionUnitTitle(unit))}</b><small>${esc([unit.work_title,unit.unit_id,unit.version].filter(Boolean).join(" · "))}</small></span></label>`).join("")}</details>`).join("")}<footer><button type="button" data-resolution-apply>Show selected readings</button></footer></details>${!units.length?'<p>No further saved layers are available for this route.</p>':""}${reference.route_truncated?'<p>This path is larger than the current display limit. Open a branch to continue.</p>':""}${arr(reference.route_limitations).length?`<details><summary>Source availability · ${arr(reference.route_limitations).length}</summary>${arr(reference.route_limitations).map(note=>`<p>${esc(typeof note==="string"?note:note.message||note.reason||"An exact saved source mapping is unavailable for part of this path.")}</p>`).join("")}</details>`:""}`
    const slider=element.querySelector("[data-resolution-depth]")
    if(slider){slider.oninput=()=>{const stop=stops[Number(slider.value)];element.querySelector("[data-resolution-depth-label]").textContent=stopLabel(stop);slider.setAttribute("aria-valuetext",stopLabel(stop));element.querySelector(".resolution-depth").style.setProperty("--resolution-accent",resolutionLayerColour(stop));element.querySelectorAll("[data-resolution-stop]").forEach(button=>button.setAttribute("aria-current",String(button.dataset.resolutionStop===stop)))};slider.onchange=()=>{runtime.connectionAction({action:"resolution",resolution:resolutionForDepth(reference,stops[Number(slider.value)])});runtime.closeConnectionResolution()}}

    root.append(element);element.querySelector("[data-resolution-close]")?.focus({preventScroll:true})
  }
  const onClick=runtime.onConnectionClick
  runtime.onConnectionClick=event=>{
    const target=event.target
    if(target.closest?.("[data-connection-resolution]")){runtime.openConnectionResolution();return true}
    const panel=target.closest?.(".connection-resolution-panel")
    if(panel){
      if(target.closest("[data-resolution-close]")){runtime.closeConnectionResolution();return true}
      const stop=target.closest("[data-resolution-stop]")
      if(stop){runtime.connectionAction({action:"resolution",resolution:resolutionForDepth(runtime.data.connection.reference,stop.dataset.resolutionStop)});runtime.closeConnectionResolution();return true}
      if(target.closest("[data-resolution-clear]")){panel.querySelectorAll("[data-resolution-unit]").forEach(input=>input.checked=false);return true}
      const mode=target.closest("[data-resolution-mode]")
      if(mode){runtime.connectionAction({action:"resolution",resolution:{mode:mode.dataset.resolutionMode}});runtime.closeConnectionResolution();return true}
      const layer=target.closest("[data-resolution-layer]")
      if(layer){event.preventDefault();const boxes=[...panel.querySelectorAll("[data-resolution-unit]")].filter(input=>input.dataset.resolutionUnitLayer===layer.dataset.resolutionLayer),checked=!boxes.every(input=>input.checked);boxes.forEach(input=>input.checked=checked);return true}
      if(target.closest("[data-resolution-apply]")){runtime.connectionAction({action:"resolution",resolution:{mode:"selected",pane_ids:[...panel.querySelectorAll("[data-resolution-unit]:checked")].map(input=>input.dataset.resolutionUnit),layers:[]}});runtime.closeConnectionResolution();return true}
      return true
    }
    runtime.closeConnectionResolution();return onClick(event)
  }
  const onKey=runtime.onKey
  runtime.onKey=event=>{if(event.target.closest?.(".connection-resolution-panel")){if(event.key==="Escape"){runtime.closeConnectionResolution();root.querySelector("[data-connection-resolution]")?.focus();event.preventDefault()}return}return onKey(event)}
}


function installPaneControls(root,states,onChange=()=>{},scope=""){
  for(const pane of root.querySelectorAll(".desk-window[data-pane],.field-pane[data-pane]")){
    const bar=pane.querySelector(":scope > .window-titlebar,:scope > .pane-top")
    if(!bar||pane.dataset.pane==="connection:explore")continue
    const key=scope+"|"+pane.dataset.pane,state=states[key]||(states[key]={}),name=(bar.querySelector("strong .reader-full-title")||bar.querySelector("strong"))?.textContent?.trim()||"pane"
    let controls=bar.querySelector(".care-pane-controls")
    if(!controls){controls=root.ownerDocument.createElement("div");controls.className="care-pane-controls";controls.setAttribute("role","group");controls.setAttribute("aria-label",`Controls for ${name}`);for(const [action,glyph] of [["minimize","−"],["sections","⌃"]]){const button=root.ownerDocument.createElement("button");button.type="button";button.dataset.paneControl=action;button.textContent=glyph;controls.append(button)}bar.prepend(controls)}
    const hasSections=[...pane.querySelectorAll("details")].some(section=>!section.matches?.(".sheet-versions")),sectionControl=[...controls.children].find(button=>button.dataset.paneControl==="sections")
    if(!hasSections)sectionControl?.remove()
    else if(!sectionControl){const button=root.ownerDocument.createElement("button");button.type="button";button.dataset.paneControl="sections";controls.append(button)}
    const paint=()=>{
      if(!pane.classList.contains("care-pane-minimized")){
        const a=controls.getBoundingClientRect(),b=bar.getBoundingClientRect()
        if(a.width&&b.width){
          // Coordinates stay relative to the title bar, but pane width includes
          // its borders. Keep those borders so the fixed dot is also centred.
          const borderWidth=Math.max(0,Number(pane.offsetWidth||0)-Number(pane.clientWidth||0))
          // Bounding rectangles are already scaled by track zoom. Convert
          // back to layout pixels before storing values that will scale again.
          const scale=(pane.getBoundingClientRect?.().width/Number(pane.offsetWidth))||1
          pane.style.setProperty("--care-controls-top",`${(a.top-b.top)/scale}px`)
          pane.style.setProperty("--care-controls-left",`${(a.left-b.left)/scale}px`)
          pane.style.setProperty("--care-folded-width",`${(2*(a.left-b.left)+(controls.firstElementChild?.getBoundingClientRect().width||16*scale))/scale+borderWidth}px`)
        }
      }
      pane.classList.toggle("care-pane-minimized",Boolean(state.minimized))
      for(const button of controls.children){const action=button.dataset.paneControl,label=action==="minimize"?(state.minimized?"Restore":"Minimise")+` ${name}`:([...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open)?"Fold":"Unfold")+` all sections in ${name}`;button.title=label;button.setAttribute("aria-label",label);button.setAttribute("aria-pressed",String(action==="minimize"?Boolean(state.minimized):![...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open)));const folded=![...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open),path=action==="minimize"?(state.minimized?"M2 6h8M6 2v8":"M2 6h8"):(folded?"M3 4l3-3 3 3M3 8l3 3 3-3":"M3 1l3 3 3-3M3 11l3-3 3 3");button.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${path}"/></svg>`;if(action==="sections")button.disabled=![...pane.querySelectorAll("details")].some(section=>!section.matches?.(".sheet-versions"))}
    }
    // Assign a local handler so repeated renders neither duplicate events nor
    // invoke Streamlit. The reading body and scroll positions stay mounted.
    controls.onclick=event=>{const button=event.target.closest("[data-pane-control]");if(!button)return;event.preventDefault();event.stopPropagation();const action=button.dataset.paneControl;if(action==="minimize")state.minimized=!state.minimized;else{const sections=[...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")),open=!sections.some(section=>section.open);sections.forEach(section=>section.open=open)}paint();onChange(pane)}
    paint()
  }
}


const DISCOVERY_ICONS={
  lateral:'<path d="M3 4h7v15H3zM14 4h7v15h-7zM10 8h4M10 15h4"/>',
  corpus:'<path d="m5 5 12-2 3 15-12 2zM5 8l-2 1 3 13 12-2M10 7h5M11 10h5"/>',
  explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
}
const discoveryIcon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true">${DISCOVERY_ICONS[kind]||DISCOVERY_ICONS.explore}</svg>`
const discoveryOrigin=data=>String(data?.stack?.work?.id||data?.stack?.work?.work_id||data?.work?.id||data?.connection?.origin_work_id||'')
function discoverySaved(data,kind=''){
  return arr(data?.connection_options).filter(option=>['lateral','corpus'].includes(option.field)&&(!kind||option.field===kind))
}
function discoveryTitle(option,data){
  if(option.field!=='lateral')return String(option.title||'Corpus')
  const explicit=arr(option.other_member_titles).filter(Boolean)
  const others=arr(option.members).filter(member=>String(member.work_id||member.id)!==String(option.origin_work_id||discoveryOrigin(data))).map(member=>member.title||member.work_title).filter(Boolean)
  return (explicit.length?explicit:others).join(' · ')||String(option.title||'Saved comparison')
}
function discoveryBooks(data){
  const origin=discoveryOrigin(data),pending=[...arr(data?.discovery_books)],seen=new Set(),books=[]
  while(pending.length){const book=pending.shift();if(!book)continue;if(arr(book.members).length){pending.push(...book.members);continue}const id=String(book.work_id||book.id||'');if(!id||id===origin||seen.has(id)||book.field)continue;seen.add(id);books.push({...book,id})}
  return books.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')))
}
function discoveryMatches(row,query){
  const words=String(query||'').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  const text=[row.title,row.author,row.description,...arr(row.layers),...arr(row.member_titles),...arr(row.other_member_titles),...arr(row.members).flatMap(member=>[member.title,member.author])].join(' ').toLocaleLowerCase()
  return words.every(word=>text.includes(word))
}
function discoveryMiniCover(book){
  return `<span class="discovery-mini-cover" aria-hidden="true" style="--cloth:${esc(book.cloth||'#353128')};--foil:${esc(book.foil||'#e9dec4')}">${book.cover_url?`<img src="${esc(book.cover_url)}" alt="" loading="lazy" decoding="async">`:`<span>${esc(book.title||'CARE')}</span>`}</span>`
}
function discoverySavedCard(option,data,compact=false){
  const title=discoveryTitle(option,data),members=arr(option.members),origin=String(option.origin_work_id||discoveryOrigin(data)),other=members.find(member=>String(member.work_id||member.id)!==origin)||members[0]||option
  const label=option.field==='corpus'?'Open corpus':'Open saved comparison',layers=arr(option.layers).join(' · '),authors=[...new Set(members.filter(member=>String(member.work_id||member.id)!==origin).map(member=>member.author).filter(Boolean))].join(' · ')
  if(compact)return `<button type="button" class="discovery-result" data-discovery-open="${esc(option.id)}" aria-label="${esc(label+': '+title)}">${discoveryMiniCover(other)}<span class="discovery-result-copy"><strong>${esc(title)}</strong><small>${esc(option.field==='corpus'?`${option.member_count||members.length} source books`:authors||'Saved comparison')}${layers?` · ${esc(layers)}`:''}</small></span><i aria-hidden="true">↗</i></button>`
  return `<button type="button" class="discovery-saved-card" data-discovery-open="${esc(option.id)}" aria-label="${esc(label+': '+title)}"><span class="discovery-cover-object">${fieldSourceCover(option)}</span><span class="discovery-saved-copy"><strong>${esc(title)}</strong><span>${esc(option.field==='corpus'?`${option.member_count||members.length} source books`:authors||'Saved comparison')}</span><small>${esc(layers||'Saved reading')} <span aria-hidden="true">↗</span></small></span></button>`
}
function discoveryBookChoice(book){
  return `<button type="button" class="discovery-result" data-discovery-compare="${esc(book.id)}" aria-label="${esc('Prepare comparison with '+book.title)}">${discoveryMiniCover(book)}<span class="discovery-result-copy"><strong>${esc(book.title||book.id)}</strong><small>${esc(book.author||'Library book')}</small></span><i aria-hidden="true">+</i></button>`
}
function discoverySearch(label,kind){
  return `<label class="discovery-search">${discoveryIcon('search')}<input type="search" data-discovery-search="${kind}" aria-label="${esc(label)}" placeholder="${esc(label)}" autocomplete="off" spellcheck="false"></label>`
}
function discoveryShelfResults(data,query=''){
  const saved=discoverySaved(data).filter(option=>discoveryMatches(option,query)),books=discoveryBooks(data).filter(book=>discoveryMatches(book,query))
  const group=(field,label)=>{const rows=saved.filter(option=>option.field===field);return rows.length?`<section class="discovery-shelf-section"><h3>${label}<small>${rows.length}</small></h3><div class="discovery-saved-grid">${rows.map(option=>discoverySavedCard(option,data)).join('')}</div></section>`:''}
  const limit=query?60:12
  return group('lateral','Saved comparisons')+group('corpus','Saved corpora')+`<section class="discovery-shelf-section"><h3>Compare with another book<small>${books.length}</small></h3>${books.slice(0,limit).map(discoveryBookChoice).join('')||`<p class="discovery-empty">${query?'No books match this search.':'Other library books will appear here.'}</p>`}${books.length>limit?`<p class="discovery-more">${books.length-limit} more books · Search by title or author.</p>`:''}</section>`
}
function connectionDiscoveryPane(data){
  if(!data?.stack?.work||(!data.connection_options?.length&&!data.discovery_books?.length)||data.reference||data.connection||arr(data.connection?.other_stacks).some(stack=>stack.reference))return ''
  const title=data.stack.work.title||'this book',count=discoverySaved(data).length
  return `<section class="desk-window connection-discovery-pane" data-pane="connection:explore" data-layer="DISCOVER" hidden><div class="window-titlebar"><strong>EXPLORE / CONNECTIONS</strong><span>${count} SAVED</span></div><div class="window-body"><header class="connection-discovery-head"><span class="pane-kicker">THE NEXT READING</span><h2>Follow a connection.</h2><p>Open a saved comparison or corpus around ${esc(title)}, or choose another book to prepare a new comparison.</p></header>${discoverySearch('Search titles, authors, or saved readings','shelf')}<div class="discovery-shelf-results" data-discovery-results>${discoveryShelfResults(data)}</div></div></section>`
}
function connectionDiscoveryControls(data){
  if(!data?.stack?.work||(!data.connection_options?.length&&!data.discovery_books?.length&&!data.connection))return ''
  const button=(kind,label)=>`<button type="button" class="desk-tab connection-discovery-button" data-discovery-menu="${kind}" aria-label="${label}" title="${label}" aria-haspopup="dialog" aria-expanded="false">${discoveryIcon(kind)}</button>`
  return `<div class="connection-controls connection-discovery-controls" aria-label="Explore connected works">${button('corpus','Add corpus')}${data.connection?'':`<button type="button" class="desk-tab connection-discovery-button" data-discovery-explore aria-label="Explore connections" title="Explore connections">${discoveryIcon('explore')}</button>`}${data.connection?.reference?'<button type="button" class="desk-action" data-connection-clear>Close route</button>':''}${data.connection?`<button type="button" class="desk-action" data-connection-close aria-label="Close connected reading">Close ${data.connection.field==='corpus'?'corpus':'comparison'} ×</button>`:''}</div>`
}
function discoveryPopoverResults(data,kind,query=''){
  const saved=discoverySaved(data,kind==='all'?'':kind).filter(option=>discoveryMatches(option,query)),books=kind==='corpus'?[]:discoveryBooks(data).filter(book=>discoveryMatches(book,query)),limit=query?60:10
  const group=(field,label)=>{const rows=saved.filter(option=>option.field===field);return rows.length?`<section class="discovery-result-group"><h3>${label}</h3>${rows.map(option=>discoverySavedCard(option,data,true)).join('')}</section>`:''}
  let html=group('lateral','Saved comparisons')+group('corpus','Saved corpora')
  if(kind!=='corpus')html+=`<section class="discovery-result-group"><h3>Prepare a new comparison</h3>${books.slice(0,limit).map(discoveryBookChoice).join('')}${books.length>limit?`<p class="discovery-empty">Search ${books.length} books by title or author.</p>`:''}</section>`
  if(!saved.length&&!books.length)html=`<p class="discovery-empty">${query?'No matching readings. Try another title or author.':kind==='corpus'?'No saved corpus includes this book yet.':'Other books and saved comparisons will appear here.'}</p>`
  return html
}
// A fresh second gesture is required: momentum from reaching the end is not intent.
function advanceDiscoveryGate(gate,{atEnd,delta,now}){
  if(!atEnd||delta<=0){gate.waiting=false;gate.intentional=false;gate.push=0;gate.last=now;return false}
  if(!gate.waiting){gate.waiting=true;gate.intentional=false;gate.push=0;gate.last=now;return false}
  if(now-gate.last>180){gate.intentional=true;gate.push=0}
  gate.last=now
  if(!gate.intentional)return false
  gate.push+=Math.max(0,delta)
  return gate.push>=120
}
function setupConnectionDiscovery(runtime){
  if(runtime.discoveryInstalled)return
  runtime.discoveryInstalled=true
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeConnectionDiscovery=({restoreFocus=false}={})=>{const current=runtime.discoveryPopover;if(!current)return;runtime.discoveryPopover=null;current.anchor?.setAttribute('aria-expanded','false');current.element.remove();if(restoreFocus&&current.anchor?.isConnected!==false)current.anchor?.focus({preventScroll:true})}
  runtime.positionConnectionDiscovery=()=>{const current=runtime.discoveryPopover;if(!current)return;const bounds=root.getBoundingClientRect(),anchor=current.anchor?.getBoundingClientRect()||bounds,width=Math.max(0,Math.min(416,bounds.width-16)),left=Math.max(8,Math.min(bounds.width-width-8,anchor.right-bounds.left-width)),top=Math.max(8,Math.min(bounds.height-120,anchor.bottom-bounds.top+7));Object.assign(current.element.style,{width:width+'px',left:left+'px',top:top+'px',maxHeight:Math.max(80,bounds.height-top-8)+'px'})}
  runtime.openConnectionDiscovery=(kind,anchor)=>{
    const same=runtime.discoveryPopover?.kind===kind&&runtime.discoveryPopover?.anchor===anchor
    runtime.closeConnectionDiscovery();if(same)return
    const popup=doc.createElement('section'),label=kind==='lateral'?'Compare books':kind==='corpus'?'Add a corpus':'Explore connections'
    popup.className='connection-discovery-popover';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',label)
    popup.innerHTML=`<div class="discovery-popover-head"><strong>${label}</strong><button type="button" class="discovery-popover-close" data-discovery-close aria-label="Close connections">×</button></div>${discoverySearch(kind==='corpus'?'Search saved corpora':'Search titles or authors','popover')}<div class="discovery-results" data-discovery-popover-results>${discoveryPopoverResults(runtime.data,kind)}</div>`
    root.append(popup);runtime.discoveryPopover={kind,anchor,element:popup};anchor?.setAttribute('aria-expanded','true');runtime.positionConnectionDiscovery();popup.querySelector('input')?.focus({preventScroll:true})
  }
  runtime.revealConnectionShelf=()=>{const pane=root.querySelector('[data-pane="connection:explore"]'),strip=root.querySelector('[data-strip]');if(!pane||!strip)return false;if(pane.hidden){runtime.discoveryBookEnd=Math.max(0,strip.scrollWidth-strip.clientWidth);pane.hidden=false;runtime.discoveryShelfEntered=false}runtime.discoveryShelfOpen=true;return true}
  runtime.syncConnectionShelf=()=>{const pane=root.querySelector('[data-pane="connection:explore"]');if(!pane)return;if(runtime.discoveryShelfOpen)pane.hidden=false}
  const originalWheel=runtime.onWheel
  runtime.onWheel=event=>{
    const pane=root.querySelector('[data-pane="connection:explore"]'),strip=root.querySelector('[data-strip]'),target=event.target
    if(pane?.hidden&&strip?.contains(target)&&!event.ctrlKey&&!event.metaKey&&(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))){const unit=event.deltaMode===1?16:event.deltaMode===2?strip.clientWidth:1,delta=(event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX)*unit,gate=runtime.discoveryGate||(runtime.discoveryGate={}),atEnd=strip.scrollLeft>=strip.scrollWidth-strip.clientWidth-2;if(advanceDiscoveryGate(gate,{atEnd,delta,now:Date.now()})){event.preventDefault();event.stopPropagation();runtime.revealConnectionShelf();strip.scrollTo({left:strip.scrollWidth-strip.clientWidth,behavior:view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return}}
    return originalWheel?.(event)
  }
  runtime.onDiscoveryShelfScroll=event=>{const strip=root.querySelector('[data-strip]'),pane=root.querySelector('[data-pane="connection:explore"]');if(event.target!==strip||!pane||pane.hidden||!runtime.discoveryShelfOpen)return;if(strip.scrollLeft>(runtime.discoveryBookEnd||0)+16)runtime.discoveryShelfEntered=true;if(runtime.discoveryShelfEntered&&strip.scrollLeft<(runtime.discoveryBookEnd||0)-32){pane.hidden=true;runtime.discoveryShelfOpen=false;runtime.discoveryShelfEntered=false;runtime.discoveryGate={}}}
  const originalClick=runtime.onConnectionClick
  runtime.onConnectionClick=event=>{
    const target=event.target,open=target.closest?.('[data-discovery-open]'),compare=target.closest?.('[data-discovery-compare]'),menu=target.closest?.('[data-discovery-menu]')
    if(open){const id=open.dataset.discoveryOpen;if(discoverySaved(runtime.data).some(option=>String(option.id)===id)){runtime.closeConnectionDiscovery();runtime.connectionAction({action:'open',id})}return true}
    if(compare){const work_id=compare.dataset.discoveryCompare;if(discoveryBooks(runtime.data).some(book=>book.id===work_id)){runtime.closeConnectionDiscovery();runtime.connectionAction({action:'start_comparison',work_id})}return true}
    if(menu){runtime.openConnectionDiscovery(menu.dataset.discoveryMenu,menu);return true}
    if(target.closest?.('[data-discovery-close]')){runtime.closeConnectionDiscovery({restoreFocus:true});return true}
    if(target.closest?.('[data-discovery-explore]')){const pane=root.querySelector('[data-pane="connection:explore"]'),strip=root.querySelector('[data-strip]');if(pane&&strip){runtime.closeConnectionDiscovery();runtime.revealConnectionShelf();const a=pane.getBoundingClientRect(),b=strip.getBoundingClientRect();strip.scrollTo({left:strip.scrollLeft+a.left-b.left-12,behavior:view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});runtime.focused='connection:explore';runtime.paintFocus?.();pane.querySelector('input')?.focus({preventScroll:true})}else runtime.openConnectionDiscovery('all',target.closest('[data-discovery-explore]'));return true}
    return originalClick?.(event)||false
  }
  runtime.onDiscoveryInput=event=>{const input=event.target?.closest?.('[data-discovery-search]');if(!input)return false;const popup=runtime.discoveryPopover;if(input.dataset.discoverySearch==='popover'&&popup){const results=popup.element.querySelector('[data-discovery-popover-results]');if(results)results.innerHTML=discoveryPopoverResults(runtime.data,popup.kind,input.value)}else{const pane=input.closest('.connection-discovery-pane'),results=pane?.querySelector('[data-discovery-results]');if(results)results.innerHTML=discoveryShelfResults(runtime.data,input.value)}return true}
  const originalChange=runtime.onConnectionChange
  runtime.onConnectionChange=event=>{if(runtime.onDiscoveryInput(event))return;return originalChange?.(event)}
  const originalKey=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.discoveryPopover
    if(popup&&event.key==='Escape'){event.preventDefault();runtime.closeConnectionDiscovery({restoreFocus:true});return}
    const scope=event.target?.closest?.('.connection-discovery-popover,.connection-discovery-pane')
    if(scope&&['ArrowDown','ArrowUp'].includes(event.key)){const buttons=[...scope.querySelectorAll('[data-discovery-open],[data-discovery-compare]')],index=buttons.indexOf(event.target),next=Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)));if(buttons[next]){event.preventDefault();buttons[next].focus({preventScroll:true});buttons[next].scrollIntoView({block:'nearest',inline:'nearest'})}return}
    if(scope&&event.key==='Enter'&&event.target?.matches?.('[data-discovery-search]')){const first=scope.querySelector('[data-discovery-open],[data-discovery-compare]');if(first){event.preventDefault();runtime.onConnectionClick({target:first})}return}
    return originalKey?.(event)
  }
  const outside=event=>{const popup=runtime.discoveryPopover;if(popup&&!popup.element.contains(event.target)&&!popup.anchor?.contains(event.target))runtime.closeConnectionDiscovery()}
  const resize=()=>runtime.positionConnectionDiscovery()
  runtime.attachConnectionDiscovery=()=>{root.addEventListener('input',runtime.onDiscoveryInput);root.addEventListener('scroll',runtime.onDiscoveryShelfScroll,true);doc.addEventListener('pointerdown',outside,true);view?.addEventListener('resize',resize)}
  runtime.cleanupConnectionDiscovery=()=>{runtime.closeConnectionDiscovery();root.removeEventListener('input',runtime.onDiscoveryInput);root.removeEventListener('scroll',runtime.onDiscoveryShelfScroll,true);doc.removeEventListener('pointerdown',outside,true);view?.removeEventListener('resize',resize)}
}


function outlineViewControl(){return '<div class="desk-view" role="group" aria-label="Reader view"><button type="button" data-reader-view="normal" aria-pressed="true" class="active" title="The original reading panes">Normal</button><button type="button" data-reader-view="outline" aria-pressed="false" title="Every chapter and CARE sheet as an expandable strip">Outline</button></div>'}
const outlineUnitId=node=>String(node?.unit_id||String(node?.id||'').split(':')[0])
function outlineLayers(data){
  const stack=data?.stack||{},reference=data?.reference,groups=new Map()
  const add=(key,layer,option)=>{
    if(!option.id)return
    if(!groups.has(key))groups.set(key,{key,layer,label:key.startsWith('MC:')?readerLayerLabel('MC',option):layer,id:`outline:${key}`,options:[]})
    const group=groups.get(key),id=String(option.id)
    if(!group.options.some(row=>row.id===id))group.options.push({...option,id,title:sliderTitle(option),routeIds:[]})
  }
  for(const chapter of sliderOptions(stack,'SOURCE'))add('SOURCE','SOURCE',chapter)
  for(const [layer,rows] of Object.entries(stack.sheet_options||{}))for(const option of arr(rows).filter(row=>row.available!==false))add(layer==='MC'?`MC:${mcLevel(option)||'legacy'}`:layer,layer,option)
  for(const unit of arr(stack.care_path))add(sheetLayerKey(unit),unit.type,unit)
  if(stack.active_chapter)add('SOURCE','SOURCE',{...stack.active_chapter,id:stack.active_chapter.raw_unit_id})
  if(isRouteReference(reference))for(const node of routeNodeIndex(reference).values()){
    const layer=node?.kind==='passage'?'SOURCE':String(node?.layer||'').toUpperCase(),id=outlineUnitId(node)
    if(!layer||!id)continue
    const key=layer==='MC'?`MC:${mcLevel(node)||'legacy'}`:layer
    add(key,layer,{id,title:node.sheet_title||node.chapter_title||id,mc_level:mcLevel(node)})
    const option=groups.get(key).options.find(row=>row.id===id)
    if(!option.routeIds.includes(String(node.id)))option.routeIds.push(String(node.id))
  }
  return [...groups.values()].sort((a,b)=>readingRank({type:a.layer,mc_level:a.key.split(':')[1]})-readingRank({type:b.layer,mc_level:b.key.split(':')[1]}))
}
function outlineRouteEndpoint(root,id){
  const member=root.querySelector(`[data-outline-members~="${CSS.escape(String(id))}"]`)
  if(!member)return null
  const toggle=member.querySelector('[data-outline-toggle]'),content=member.querySelector('.outline-content')
  if(content?.hidden)return toggle
  const exact=member.querySelector(`[data-ref-id="${CSS.escape(String(id))}"]`)
  if(!exact)return toggle
  const section=exact.closest('details')
  return section&&!section.open?section.querySelector('summary'):exact
}
function outlineRouteCards(runtime){
  const cards=new Map()
  for(const id of routeNodeIndex(runtime.data?.reference).keys()){const card=outlineRouteEndpoint(runtime.root,id);if(card)cards.set(id,card)}
  return cards
}
function drawOutlineThreads(runtime){
  const root=runtime.root,reference=runtime.data?.reference,strip=root.querySelector('[data-strip]')
  root.querySelector('[data-route-threads]')?.remove()
  let svg=root.querySelector('[data-outline-threads]')
  if(!isRouteReference(reference)||!strip){svg?.remove();return}
  if(!svg){svg=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','outline-thread-overlay');svg.setAttribute('data-outline-threads','');svg.setAttribute('aria-hidden','true');root.append(svg)}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),geometry=new Map(),scale=readerLayoutScale(root,bounds)
  outlineRouteCards(runtime).forEach((card,id)=>{
    const rect=card.getBoundingClientRect(),body=card.closest('.window-body')?.getBoundingClientRect()
    if(!body||!rect.width||!rect.height||rect.right<=clip.left||rect.left>=clip.right)return
    const y=Math.max(Math.max(body.top,clip.top)+7,Math.min(Math.min(body.bottom,clip.bottom)-7,rect.top+rect.height/2))
    geometry.set(id,{rect,y,pane:card.closest('[data-pane]'),fullyVisible:card.dataset?.refId===String(id)&&rect.bottom>Math.max(body.top,clip.top)+8&&rect.top<Math.min(body.bottom,clip.bottom)-8})
  })
  const drawable=exactRouteEdges(reference).filter(edge=>geometry.has(String(edge.source_id))&&geometry.has(String(edge.target_id)))
  // Folded/loading strips and margin continuations retain their lines, but
  // cannot substitute for an exact visible feeder path.
  const fullyVisible=edge=>geometry.get(String(edge.source_id)).fullyVisible&&geometry.get(String(edge.target_id)).fullyVisible
  const retained=new Set(displayRouteEdges(drawable.filter(fullyVisible),runtime.connectionView))
  const active=runtime.outlineHoverIds||new Set(),paths=drawable.filter(edge=>!fullyVisible(edge)||retained.has(edge)).map((edge,index)=>{
    const from=geometry.get(String(edge.source_id)),to=geometry.get(String(edge.target_id));if(!from||!to)return ''
    const same=from.pane===to.pane,forward=from.rect.left<to.rect.left
    const x1=((same?from.rect.left+2:forward?from.rect.right-2:from.rect.left+2)-bounds.left)/scale,x2=((same?to.rect.left+2:forward?to.rect.left+2:to.rect.right-2)-bounds.left)/scale,y1=(from.y-bounds.top)/scale,y2=(to.y-bounds.top)/scale,bend=Math.max(20,Math.abs(x2-x1)*.48),sign=forward?1:-1
    const color=layerColor(edge.source_layer,edge.source_id),target=layerColor(edge.target_layer,edge.target_id),lit=active.has(String(edge.source_id))||active.has(String(edge.target_id)),gradient=`outline-thread-${index}`
    return `<defs><linearGradient id="${gradient}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop stop-color="${color}"/><stop offset="1" stop-color="${target}"/></linearGradient></defs><path class="outline-thread${lit?' active':''}" data-outline-source="${esc(edge.source_id)}" data-outline-target="${esc(edge.target_id)}" stroke="url(#${gradient})" d="M ${x1} ${y1} C ${same?x1-16:x1+bend*sign} ${y1},${same?x2-16:x2-bend*sign} ${y2},${x2} ${y2}"/><circle class="outline-port" cx="${x1}" cy="${y1}" r="${lit?3:2}" stroke="${color}"/><circle class="outline-port" cx="${x2}" cy="${y2}" r="${lit?3:2}" stroke="${target}"/>`
  }).join('')
  svg.setAttribute('viewBox',`0 0 ${bounds.width/scale} ${bounds.height/scale}`);svg.innerHTML=paths
}
function setupOutlineView(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  runtime.readerView='normal';runtime.outlineBooks=new Map();runtime.outlineHoverIds=new Set()
  const bookKey=()=>`${runtime.data?.stack?.work?.id||''}|${runtime.data?.outline_context||''}`
  runtime.outlineState=()=>{
    const key=bookKey()
    if(!runtime.outlineBooks.has(key))runtime.outlineBooks.set(key,{open:new Set(),cache:new Map(),positions:new Map(),sections:new Map(),left:0,routeOnly:false,requests:new Map(),errors:new Map()})
    return runtime.outlineBooks.get(key)
  }
  runtime.ingestOutline=()=>{
    const state=runtime.outlineState(),stack=runtime.data?.stack||{}
    for(const unit of arr(stack.care_path))state.cache.set(String(unit.id),{unit})
    if(stack.active_chapter)state.cache.set(String(stack.active_chapter.raw_unit_id),{chapter:stack.active_chapter})
    for(const row of arr(runtime.data?.outline_units))if(row.work_id===stack.work?.id&&(row.unit||row.chapter)){state.cache.set(String(row.id),row);if(state.requests.get(String(row.id))===row.request_id)state.requests.delete(String(row.id))}
    const response=runtime.data?.outline_response
    if(response&&response.work_id===stack.work?.id&&state.requests.get(String(response.id))===response.request_id){
      state.requests.delete(String(response.id))
      if(response.error)state.errors.set(String(response.id),response.error)
      else {state.cache.set(String(response.id),response);state.errors.delete(String(response.id))}
    }
    // Keep open readers; discard the oldest closed content when traversing a long book.
    for(const id of state.cache.keys())if(state.cache.size>32&&!state.open.has(id))state.cache.delete(id)
  }
  runtime.captureOutline=()=>{
    if(!root.querySelector('.outline-lane'))return
    const state=runtime.outlineState(),strip=root.querySelector('[data-strip]');state.left=strip?.scrollLeft||0
    root.querySelectorAll('.outline-lane').forEach(lane=>state.positions.set(lane.dataset.outlineLayer,lane.querySelector('.window-body').scrollTop))
    root.querySelectorAll('.outline-sheet').forEach(sheet=>{const sections=[...sheet.querySelectorAll('.care-section')];if(sections.length)state.sections.set(sheet.dataset.outlineSheet,sections.map(section=>section.open))})
  }
  runtime.restoreNormalOutline=()=>{
    const parked=runtime.outlineParked;if(!parked)return
    runtime.captureOutline()
    const strip=root.querySelector('[data-strip]')
    if(strip){strip.replaceChildren(...parked.nodes);strip.scrollLeft=parked.left;for(const [body,top,left] of parked.positions||[]){body.scrollTop=top;body.scrollLeft=left}}
    const tabs=root.querySelector('.desk-tabs');if(tabs)tabs.innerHTML=parked.tabs
    runtime.focused=parked.focused
    root.querySelector('[data-outline-threads]')?.remove()
    runtime.outlineParked=null;root.dataset.view='normal'
    root.querySelector('[data-outline-tools]')?.remove()
    runtime.paintOutlineSwitch()
  }
  runtime.beforeOutlineRender=()=>{runtime.restoreNormalOutline()}
  runtime.paintOutlineSwitch=()=>root.querySelectorAll('[data-reader-view]').forEach(button=>{const connected=Boolean(runtime.data?.connection?.reference),active=button.dataset.readerView===(connected?'normal':runtime.readerView);button.disabled=connected&&button.dataset.readerView==='outline';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))})
  runtime.outlineContent=(option,group)=>{
    const state=runtime.outlineState(),loaded=state.cache.get(option.id),reference=runtime.data?.reference,template=root.ownerDocument.createElement('template')
    if(loaded?.chapter){template.innerHTML=sourcePane({...runtime.data.stack,active_chapter:loaded.chapter},String(reference?.id||''),null)}
    else if(loaded?.unit){template.innerHTML=carePane(loaded.unit,0,'',null,{},new Set(),false)}
    else {
      const nodes=routeNodeIndex(reference),items=option.routeIds.map(id=>nodes.get(id)).filter(Boolean),error=state.errors.get(option.id)
      const snippets=group.layer==='SOURCE'?items.map(item=>`<div class="passage-row"><article class="route-source-card" data-ref-id="${esc(item.id)}" data-select-passage="${esc(item.id)}" data-source-unit="${esc(option.id)}" role="button" tabindex="0"><span class="passage-address">${esc(item.id)}</span><div class="passage-text">${item.reading_block_html ?? esc(item.text)}</div></article><button type="button" class="axiom-routes" data-open-passage-routes="${esc(item.id)}" hidden>Routes</button></div>`).join(''):routeGroups(items,String(reference?.id||''))
      return `<p class="outline-load-note" role="status">${error?`${esc(error)} <button type="button" data-outline-retry="${esc(option.id)}">Retry</button>`:'Opening the full '+(group.layer==='SOURCE'?'chapter':'CARE sheet')+'…'}</p>${snippets}`
    }
    const body=template.content.querySelector('.window-body')
    body?.querySelectorAll('[data-select-axiom]').forEach(button=>{
      button.dataset.selectionUnit=option.id
      if(option.routeIds.includes(button.dataset.refId)){
        button.classList.add('route-feeder');button.closest('details').open=true
        if(button.dataset.refId===String(reference?.id)){button.classList.add('selected');button.parentElement.insertAdjacentHTML('beforeend',routeArrival(reference))}
      }
    })
    body?.querySelectorAll('[data-select-passage]').forEach(button=>{if(option.routeIds.includes(button.dataset.refId))button.classList.add('selected')})
    const saved=state.sections.get(option.id)
    if(saved)body?.querySelectorAll('.care-section').forEach((section,index)=>{if(typeof saved[index]==='boolean')section.open=saved[index]})
    return (body?.innerHTML||'')+`<button type="button" class="outline-close-bottom" data-outline-toggle="${esc(option.id)}">− Close ${group.layer==='SOURCE'?'chapter':'sheet'} · ${esc(option.title)}</button>`
  }
  runtime.requestOutline=(option,group,force=false)=>{
    const state=runtime.outlineState();if((state.cache.has(option.id)&&!force)||state.requests.size||state.errors.has(option.id))return
    const request_id=`${Date.now()}-${Math.random().toString(36).slice(2)}`;state.requests.set(option.id,request_id)
    runtime.api?.setTriggerValue('open_outline_sheet',{id:option.id,layer:group.key,request_id})
  }
  runtime.renderOutlineSheet=(option,group,index)=>{
    const state=runtime.outlineState(),open=state.open.has(option.id),members=option.routeIds
    return `<section class="outline-sheet${members.length?' outline-on-route':''}" data-outline-sheet="${esc(option.id)}" data-outline-members="${esc(members.join(' '))}"${state.routeOnly&&isRouteReference(runtime.data?.reference)&&!members.length?' hidden':''}><button type="button" class="outline-strip" data-outline-toggle="${esc(option.id)}" aria-expanded="${open}" aria-controls="outline-body-${esc(option.id)}" title="${esc(option.title)}"><span class="outline-fold" aria-hidden="true">${open?'−':'+'}</span><span class="outline-order">${String(option.chapter_number||option.sequence_number||index+1).padStart(2,'0')}</span><span class="outline-strip-title">${esc(option.title)}</span>${members.length?`<span class="outline-route-count" title="${members.length} exact route ${members.length===1?'point':'points'}">${members.length}</span>`:''}</button><div class="outline-content" id="outline-body-${esc(option.id)}"${open?'':' hidden'}>${open?runtime.outlineContent(option,group):''}</div></section>`
  }
  runtime.applyOutline=()=>{
    if(runtime.data?.outline_available&&!root.querySelector('[data-reader-view]'))root.querySelector('.desk-skin')?.insertAdjacentHTML('beforebegin',outlineViewControl())
    runtime.ingestOutline();runtime.paintOutlineSwitch()
    if(runtime.readerView!=='outline'||runtime.data?.mode==='library'||runtime.data?.connection?.reference)return
    const strip=root.querySelector('[data-strip]');if(!strip||root.querySelector('.outline-lane'))return
    const state=runtime.outlineState(),groups=outlineLayers(runtime.data),tabs=root.querySelector('.desk-tabs'),reference=runtime.data?.reference
    runtime.outlineGroups=groups
    if(runtime.readerView==='outline')workspaceCheckpoint(runtime)
    runtime.outlineParked={nodes:[...strip.childNodes],tabs:tabs?.innerHTML||'',left:strip.scrollLeft,focused:runtime.focused,positions:[...strip.querySelectorAll('.window-body')].map(body=>[body,body.scrollTop,body.scrollLeft])}
    root.dataset.view='outline'
    strip.innerHTML=groups.map(group=>`<section class="desk-window outline-lane ${group.layer==='SOURCE'?'source-pane':'care-pane'}" data-pane="${esc(group.id)}" data-outline-layer="${esc(group.key)}" data-layer="${esc(group.layer)}"${group.layer==='MC'?` data-mc-level="${esc(group.key.split(':')[1])}"`:''}${group.layer==='SOURCE'?'':' data-reading-sheet'} style="--pane-accent:${layerColor(group.layer,{mc_level:group.key.split(':')[1]})}"><div class="outline-lane-head"><strong>${esc(group.label)}</strong><span>${group.options.length} ${group.layer==='SOURCE'?'chapters':'sheets'}</span><button type="button" data-outline-collapse="${esc(group.key)}" title="Close every strip in ${esc(group.label)}">Fold all</button></div><div class="window-body">${group.options.map((option,index)=>runtime.renderOutlineSheet(option,group,index)).join('')||'<p class="outline-empty">No sheets at this layer.</p>'}</div></section>`).join('')
    // Connected fields keep their canonical panes and their own controls.
    for(const node of runtime.outlineParked.nodes)if(node.nodeType===1&&node.matches('[data-connection-field],[data-connection-book],.connection-discovery-pane'))strip.append(node)
    if(tabs)tabs.innerHTML=groups.map(group=>paneTab(group.id,group.label)).join('')
    const status=root.querySelector('.desk-status')
    status?.insertAdjacentHTML('beforeend',`<div class="outline-tools" data-outline-tools><span>Open a strip to read · routes follow every fold</span>${isRouteReference(reference)?`<button type="button" class="desk-tab" data-outline-route-only aria-pressed="${state.routeOnly}">${state.routeOnly?'Show whole book':'Route strips only'}</button>`:''}<button type="button" class="desk-tab" data-outline-collapse="*">Fold all</button>${isRouteReference(reference)?trackZoomControls():''}</div>`)
    root.querySelectorAll('.outline-lane').forEach(lane=>{lane.querySelector('.window-body').scrollTop=state.positions.get(lane.dataset.outlineLayer)||0})
    strip.scrollLeft=state.left
    runtime.focused=groups.find(group=>group.key===state.focused)?.id||groups[0]?.id||'source'
    runtime.paintSelection();decorateReadingActions(runtime);runtime.paintFocus();runtime.applyTrackZoom();runtime.queueThreads()
    // Only explicitly opened strips cause I/O, never every title in a long book.
    const pending=runtime.outlineViewerPending
    if(pending){
      if(arr(runtime.data?.outline_units).some(row=>row.id===pending.id)){runtime.viewerSelectionPending=true;runtime.onViewerReady?.();runtime.outlineViewerPending=null}
      else runtime.requestOutline(pending.option,pending.group,true)
    }
    for(const group of groups)for(const option of group.options)if(state.open.has(option.id))runtime.requestOutline(option,group)
  }
  runtime.setReaderView=value=>{
    if(!['normal','outline'].includes(value)||value===runtime.readerView)return
    runtime.restoreNormalOutline();runtime.readerView=value
    runtime.applyOutline();runtime.paintOutlineSwitch();runtime.applyTrackZoom();runtime.paintFocus();runtime.queueThreads()
  }
  const zoom=runtime.applyTrackZoom
  runtime.applyTrackZoom=()=>{
    zoom?.()
    if(root.dataset.view!=='outline')return
    const strip=root.querySelector('[data-strip]');if(!strip)return
    const style=view.getComputedStyle(strip),height=strip.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0),scale=Number(strip.dataset.trackScale)||1
    strip.querySelectorAll('.outline-lane').forEach(lane=>{lane.style.height=`${height/scale}px`})
  }
  const paintFocus=runtime.paintFocus
  runtime.paintFocus=()=>{paintFocus?.();if(root.dataset.view==='outline'){const group=runtime.outlineGroups?.find(row=>row.id===runtime.focused),label=root.querySelector('[data-focus-label]');if(group&&label)label.textContent=`FOCUS · ${group.label}`}}
  const click=runtime.onClick
  runtime.onClick=event=>{
    const switcher=event.target?.closest?.('[data-reader-view]');if(switcher){event.preventDefault();runtime.setReaderView(switcher.dataset.readerView);return}
    if(runtime.readerView!=='outline')return click(event)
    const sectionAction=event.target?.closest?.('[data-sheet-sections]')
    if(sectionAction){const sheet=sectionAction.closest('.outline-sheet');if(sheet){event.preventDefault();sheet.querySelectorAll('.care-section').forEach(section=>section.open=sectionAction.dataset.sheetSections==='expand');runtime.captureOutline();runtime.paintSelection();runtime.queueThreads();return}}
    const selected=event.target?.closest?.('[data-select-axiom],[data-select-passage]')
    if(selected){
      const id=selected.dataset.selectionUnit||selected.dataset.sourceUnit,known=[...arr(runtime.data?.outline_units).map(row=>row.id),...arr(runtime.data?.stack?.care_path).map(unit=>unit.id),runtime.data?.stack?.active_chapter?.raw_unit_id]
      if(id&&!known.includes(id)){const group=runtime.outlineGroups.find(group=>group.options.some(option=>option.id===id)),option=group?.options.find(option=>option.id===id);if(option){runtime.outlineViewerPending={id,group,option};runtime.requestOutline(option,group,true);runtime.viewerSelectionPending=true}}
    }
    const target=event.target?.closest?.('[data-outline-toggle],[data-outline-retry]')
    if(target){
      event.preventDefault();const id=target.dataset.outlineToggle||target.dataset.outlineRetry,group=runtime.outlineGroups.find(group=>group.options.some(option=>option.id===id)),option=group?.options.find(option=>option.id===id);if(!option)return
      const state=runtime.outlineState(),sheet=target.closest('.outline-sheet'),body=sheet.closest('.window-body'),top=sheet.getBoundingClientRect().top,bounds=body.getBoundingClientRect(),content=sheet.querySelector('.outline-content'),button=sheet.querySelector('.outline-strip')
      runtime.captureOutline();state.focused=group.key
      const open=target.dataset.outlineRetry||!state.open.has(id)
      if(open){state.open.add(id);if(target.dataset.outlineRetry)state.errors.delete(id);if(!content.innerHTML||target.dataset.outlineRetry)content.innerHTML=runtime.outlineContent(option,group);runtime.requestOutline(option,group)}else state.open.delete(id)
      content.hidden=!open;button.setAttribute('aria-expanded',String(Boolean(open)));button.querySelector('.outline-fold').textContent=open?'−':'+'
      if(!open&&top<bounds.top)body.scrollTop+= (top-bounds.top)/readerLayoutScale(body,bounds)
      button.focus({preventScroll:true});runtime.paintSelection();decorateReadingActions(runtime);runtime.queueThreads();return
    }
    const collapse=event.target?.closest?.('[data-outline-collapse]')
    if(collapse){
      const state=runtime.outlineState();runtime.captureOutline()
      root.querySelectorAll('.outline-lane').forEach(lane=>{if(collapse.dataset.outlineCollapse!=='*'&&collapse.dataset.outlineCollapse!==lane.dataset.outlineLayer)return;lane.querySelectorAll('.outline-sheet').forEach(sheet=>{state.open.delete(sheet.dataset.outlineSheet);sheet.querySelector('.outline-content').hidden=true;sheet.querySelector('.outline-strip').setAttribute('aria-expanded','false');sheet.querySelector('.outline-fold').textContent='+'});lane.querySelector('.window-body').scrollTop=0});runtime.queueThreads();return
    }
    const filter=event.target?.closest?.('[data-outline-route-only]')
    if(filter){const state=runtime.outlineState();state.routeOnly=!state.routeOnly;runtime.restoreNormalOutline();runtime.applyOutline();return}
    return click(event)
  }
  const hover=runtime.onRouteHover
  runtime.onRouteHover=event=>{
    if(runtime.readerView!=='outline')return hover(event)
    const out=['pointerout','focusout'].includes(event.type),card=event.target?.closest?.('[data-ref-id]'),sheet=event.target?.closest?.('.outline-sheet'),ids=out?[]:card?[card.dataset.refId]:(sheet?.dataset.outlineMembers||'').split(' ').filter(Boolean)
    runtime.outlineHoverIds=new Set(ids)
    const related=new Set(exactRouteEdges(runtime.data?.reference).filter(edge=>ids.includes(String(edge.source_id))||ids.includes(String(edge.target_id))).flatMap(edge=>[String(edge.source_id),String(edge.target_id)]))
    root.querySelectorAll('.outline-sheet').forEach(row=>row.classList.toggle('outline-related',row.dataset.outlineMembers.split(' ').some(id=>related.has(id))))
    runtime.queueThreads()
  }
}


function dialogueMedia(data){
  const media=data?.dialogue_media
  // URLs are produced by the authenticated, content-addressed local media route.
  return data?.mode!=='library'&&media&&['video','audio'].includes(media.kind)&&/^\/dialogue-media\/[a-f0-9]+\.[a-z0-9]+$/i.test(String(media.url||''))?media:null
}
function dialogueTime(value){const seconds=Math.max(0,Math.floor(Number(value)||0)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return `${hours?`${hours}:${String(minutes).padStart(2,'0')}`:minutes}:${String(seconds%60).padStart(2,'0')}`}
function dialogueTimingRanges(media){return arr(media?.timings).flatMap(item=>(arr(item.ranges).length?item.ranges:[item]).map(range=>({passage_id:String(item.passage_id||''),start:Number(range.start_seconds),end:Number(range.end_seconds)}))).filter(row=>row.passage_id&&Number.isFinite(row.start)&&Number.isFinite(row.end)&&row.end>row.start).sort((a,b)=>a.start-b.start)}
function dialogueActiveRange(rows,time){
  // A gap in the saved evidence is deliberately not attributed to a passage.
  let low=0,high=rows.length
  while(low<high){const middle=(low+high)>>1;if(rows[middle].start<=time)low=middle+1;else high=middle}
  for(let index=low-1;index>=0;index--)if(time<rows[index].end)return rows[index]
  return null
}
function dialoguePane(data){
  const media=dialogueMedia(data);if(!media)return ''
  return `<section class="desk-window dialogue-pane" data-pane="dialogue-media" data-layer="RECORDING" style="--pane-accent:#796044"><div class="window-titlebar"><strong>${media.kind==='audio'?'AUDIO':'VIDEO'} / ${esc(media.title||'Recording')}</strong></div><div class="window-body"><p class="dialogue-pane-intro">Watch or listen alongside the source. Select a timed passage to return to its moment in the recording.</p><div class="dialogue-media-slot" data-dialogue-media-slot data-media-kind="${media.kind}"></div><div class="dialogue-caption"><small data-dialogue-speaker>TRANSCRIPT</small><p data-dialogue-caption>The transcript follows as the recording plays.</p></div>${media.timing_warning?`<p class="dialogue-timing-note">${esc(media.timing_warning)}</p>`:''}<p class="dialogue-playback-error" data-dialogue-error role="status" hidden></p></div></section>`
}
function dialogueDock(data){
  const media=dialogueMedia(data);if(!media)return ''
  return `<div class="dialogue-dock" role="group" aria-label="Recording playback"><button type="button" data-dialogue-play aria-label="Play recording"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 3 11 7-11 7z"/></svg></button><span class="dialogue-dock-title">${esc(media.title||'Recording')}</span><span class="dialogue-dock-time" data-dialogue-time>0:00 / ${dialogueTime(media.duration)}</span><input type="range" data-dialogue-seek aria-label="Recording position" min="0" max="${Math.max(1,Number(media.duration)||1)}" step="0.1" value="0"><select data-dialogue-rate aria-label="Playback speed">${[.75,1,1.25,1.5,1.75,2].map(rate=>`<option value="${rate}"${rate===1?' selected':''}>${rate}×</option>`).join('')}</select><button type="button" data-dialogue-follow aria-pressed="true">Follow transcript</button><button type="button" data-dialogue-show>${media.kind==='audio'?'Audio':'Video'} pane</button></div>`
}
function dialogueContributionFrame(contributions,time){
  const rows=arr(contributions).flatMap(contribution=>(arr(contribution.ranges).length?contribution.ranges:[contribution]).map(range=>({contribution,start:Number(range.start_seconds),end:Number(range.end_seconds)}))).filter(row=>Number.isFinite(row.start)&&Number.isFinite(row.end)&&row.end>row.start).sort((a,b)=>a.start-b.start)
  const active=rows.filter(row=>row.start<=time&&time<row.end)
  if(active.length)return {phase:'IN THIS MOMENT',entries:[...new Map(active.map(row=>[row.contribution.id,row])).values()]}
  const previous=rows.filter(row=>row.start<=time).at(-1),next=rows.find(row=>row.start>time)
  return previous?{phase:'RECENT CONTRIBUTION',entries:[previous]}:next?{phase:'UP NEXT',entries:[next]}:{phase:'EXCHANGE',entries:[]}
}
function dialogueExchangePane(data){
  const media=dialogueMedia(data);if(!media||!arr(media.contributions).length)return ''
  const groups=new Map();for(const contribution of media.contributions){const key=contribution.issue_id||contribution.question||'Conversation';if(!groups.has(key))groups.set(key,{question:contribution.question||'Conversation',items:[]});groups.get(key).items.push(contribution)}
  return `<section class="desk-window care-pane dialogue-exchange-pane" data-pane="dialogue-exchange" data-layer="EXCHANGE" style="--pane-accent:#4f7477"><div class="window-titlebar"><strong>EXCHANGE / ${esc(media.title||'Conversation')}</strong></div><div class="window-body" data-dialogue-contribution><div class="dialogue-exchange-controls"><button type="button" data-dialogue-follow aria-pressed="true">Follow transcript &amp; Exchange</button><span data-dialogue-exchange-status>All ${media.contributions.length} saved contributions</span></div><div class="care-sections">${[...groups.values()].map((group,index)=>`<details class="care-section"${index===0?' open':''}><summary><span>${String(index+1).padStart(2,'0')} · ${esc(group.question)}</span><small>${group.items.length}</small></summary><div class="axiom-list">${dialogueContributionHTML({phase:'CONTRIBUTION',entries:group.items.map(contribution=>({contribution,start:contribution.start_seconds??arr(contribution.ranges)[0]?.start_seconds}))},true)}</div></details>`).join('')}</div></div></section>`
}
function dialogueContributionHTML(frame,full=false){
  if(!frame.entries.length)return '<p class="dialogue-pane-intro">This Exchange has no timed contributions yet. The original source remains available beside it.</p>'
  return frame.entries.map(({contribution:c,start})=>`<article class="dialogue-exchange-entry" data-dialogue-contribution-id="${esc(c.id)}"><small class="dialogue-exchange-phase">${esc(frame.phase==='IN THIS MOMENT'&&c.timing_confidence==='source_context'?'FROM THIS PASSAGE':frame.phase)}${Number.isFinite(start)?` · ${dialogueTime(start)}`:' · untimed'}</small>${c.question&&!full?`<h2 class="dialogue-exchange-question">${esc(c.question)}</h2>`:''}<h3 class="dialogue-exchange-voice">${esc(c.display_attribution?.speaker_name?dialogueAttributionVoice(c.display_attribution):c.speaker_name||'Speaker')}</h3><span class="dialogue-exchange-kind">${esc(c.kind||'Contribution')}${c.display_attribution?.speaker_name?' · '+esc(dialogueAttributionNote(c.display_attribution)):c.attribution_status==='provisional'?' · provisional attribution':''}</span>${dialogueAttributionBasis(c.display_attribution)}<p class="dialogue-exchange-text">${esc(c.text)}</p>${dialogueTraceNote(c)}<div class="dialogue-exchange-actions">${arr(c.passage_ids).map((id,index)=>`<button type="button" data-dialogue-evidence="${esc(id)}">Read the transcript${arr(c.passage_ids).length>1?` · ${index+1}`:''} ↗</button>`).join('')}${Number.isFinite(start)?`<button type="button" data-dialogue-moment="${start}">Play from ${dialogueTime(start)} ↗</button>`:''}</div>${arr(c.care_details).length?`<section class="dialogue-exchange-care"><small>MORE FROM THIS PASSAGE · CARE</small>${arr(c.care_details).map(detail=>`<article><small>${esc(detail.section_title||'CARE')}${detail.stance?` · ${esc(detail.stance)}`:''}</small><p>${esc(detail.text)}</p>${dialogueTraceNote(detail)}${dialogueMainPremises(detail)}${arr(detail.passage_ids).map((id,index)=>`<button type="button" class="dialogue-care-evidence" data-dialogue-evidence="${esc(id)}">Read this CARE evidence${arr(detail.passage_ids).length>1?` · ${index+1}`:''} ↗</button>`).join('')}</article>`).join('')}</section>`:''}</article>`).join('')
}
function dialogueMainPremises(item){return arr(item.resolved_source_trace).map(id=>`<button type="button" class="dialogue-care-evidence" data-dialogue-care-premise="${esc(id)}">Premise · ${esc(id)} ↗</button>`).join('')}
function retainStudySliderMarkup(runtime,fragment){
  const input=runtime.sliderGesture,root=runtime.root
  if(!input?.isConnected||runtime.data?.reference)return false
  const control=input.closest('[data-slider-control]')
  const replacement=fragment.querySelector(`[data-retained-slider="${CSS.escape(input.dataset.sheetSlider)}"]`)||fragment.querySelector(`[data-sheet-slider="${CSS.escape(input.dataset.sheetSlider)}"]`)?.closest('[data-slider-control]')
  if(!control||!replacement)return false
  const path=(node,end)=>{const rows=[];while(node&&node!==end){rows.push(node);node=node.parentNode}return node===end?rows:null}
  const oldPath=path(control,root),newPath=path(replacement,fragment)
  if(!oldPath||!newPath||oldPath.length!==newPath.length||oldPath.some((node,index)=>node.tagName!==newPath[index].tagName))return false
  // Keep the range, rail and every ancestor connected throughout a native
  // pointer gesture. Detaching/reinserting the input cancels browser dragging.
  for(let index=0;index<oldPath.length;index++){
    const keep=oldPath[index],next=newPath[index],parent=keep.parentNode
    if(index>0){
      for(const attribute of [...keep.attributes])if(!next.hasAttribute(attribute.name))keep.removeAttribute(attribute.name)
      for(const attribute of [...next.attributes])keep.setAttribute(attribute.name,attribute.value)
    }
    for(const child of [...parent.childNodes])if(child!==keep)child.remove()
    let after=false
    for(const child of [...next.parentNode.childNodes]){
      if(child===next){after=true;continue}
      parent.insertBefore(child,after?null:keep)
    }
  }
  return true
}
function replaceStudyDeskMarkup(runtime,markup){
  const root=runtime.root,host=runtime.dialoguePlayer?.host
  const original=root.querySelector('[data-pane="original"]'),source=runtime.data?.stack?.original_reader
  const retainedPanes=new Map([...root.querySelectorAll('[data-pane]')].map(pane=>[pane.dataset.pane,pane]))
  const retainedSliders=new Map([...root.querySelectorAll('[data-sheet-slider]')].filter(input=>!input.closest('[data-connection-book]')).map(input=>[input.dataset.sheetSlider,input.closest('[data-slider-control]')]))
  const restoreReading=()=>{
    for(const placeholder of root.querySelectorAll('[data-retained-pane]')){const pane=retainedPanes.get(placeholder.dataset.retainedPane);if(pane)placeholder.replaceWith(pane)}
    for(const placeholder of root.querySelectorAll('[data-retained-slider]')){const slider=retainedSliders.get(placeholder.dataset.retainedSlider);if(slider)placeholder.replaceWith(slider)}
  }
  const keepOriginal=original&&source&&runtime.originalState?.id===source.id
  const restoreOriginal=()=>{restoreReading();const replacement=root.querySelector('[data-pane="original"]');if(keepOriginal&&replacement)replacement.replaceWith(original)}
  if(runtime.sliderGesture){
    const template=root.ownerDocument.createElement('template');template.innerHTML=markup
    if(retainStudySliderMarkup(runtime,template.content)){restoreOriginal();return}
  }
  if(!host||host.parentNode!==root){root.innerHTML=markup;restoreOriginal();return}
  // Keep the actual media element connected while source/route panes redraw.
  // Replacing innerHTML here would interrupt playback even at the same URL.
  const template=root.ownerDocument.createElement('template');template.innerHTML=markup
  for(const child of [...root.childNodes])if(child!==host)child.remove()
  root.insertBefore(template.content,host)
  restoreOriginal()
}
function setupDialoguePlayer(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  const pause=()=>runtime.dialoguePlayer?.media.pause()
  const save=()=>{const player=runtime.dialoguePlayer;if(!player)return;const state=player.thinker;try{view?.sessionStorage?.setItem(`care-dialogue-playback/1:${player.id}`,JSON.stringify({time:player.media.currentTime,rate:player.media.playbackRate,follow:player.follow,thinker:state?{id:state.id,follow:state.follow,mode:state.mode,wb:state.wb}:null}))}catch(_){}}
  const play=()=>{const player=runtime.dialoguePlayer;if(!player)return;const pending=player.media.play();pending?.catch(()=>{player.error='Press play to start the recording.';runtime.paintDialoguePlayer()})}
  runtime.disposeDialoguePlayer=()=>{const player=runtime.dialoguePlayer;if(!player)return;save();pause();player.host.remove();runtime.dialoguePlayer=null;delete root.dataset.dialogueReady}
  runtime.seekDialogue=time=>{const player=runtime.dialoguePlayer;if(!player||!Number.isFinite(Number(time)))return;const limit=Number.isFinite(player.media.duration)?player.media.duration:Number(player.payload.duration)||Infinity,value=Math.max(0,Math.min(Number(time),limit));player.pendingTime=Number(player.media.readyState)===0?value:null;try{player.media.currentTime=value}catch(_){player.pendingTime=value}player.activePassage='';runtime.paintDialoguePlayer();save()}
  runtime.scrollDialogueCard=card=>{const body=card?.closest('.window-body');if(!body)return;const a=card.getBoundingClientRect(),b=body.getBoundingClientRect(),scale=(b.height/Number(body.offsetHeight))||1;body.scrollTop+=(a.top-b.top-b.height*.2)/scale;runtime.positionDialoguePlayer()}
  runtime.positionDialoguePlayer=()=>{
    const player=runtime.dialoguePlayer;if(!player)return
    const slot=root.querySelector('[data-dialogue-media-slot]'),pane=slot?.closest('[data-pane]'),strip=root.querySelector('[data-strip]')
    // Native focus/scrollIntoView can move an overflow-hidden axis when panes
    // are scaled. Only pane bodies scroll vertically; keep the track anchored.
    if(strip?.scrollTop)strip.scrollTop=0
    const parked=!slot||!strip||Boolean(pane?.classList.contains('care-pane-minimized'))
    player.host.dataset.parked=String(parked)
    player.host.inert=parked;player.host.setAttribute('aria-hidden',String(parked))
    if(parked)return
    const rect=slot.getBoundingClientRect(),bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),body=slot.closest('.window-body')?.getBoundingClientRect()||clip
    const edge={top:Math.max(body.top,clip.top,bounds.top),bottom:Math.min(body.bottom,clip.bottom,bounds.bottom),left:Math.max(clip.left,bounds.left),right:Math.min(clip.right,bounds.right)}
    if(!rect.width||!rect.height||rect.right<=edge.left||rect.left>=edge.right||rect.bottom<=edge.top||rect.top>=edge.bottom){player.host.dataset.parked='true';player.host.inert=true;player.host.setAttribute('aria-hidden','true');return}
    // Track zoom scales the pane; positioning follows its rendered rectangle.
    const scale=(bounds.width/Number(root.offsetWidth))||1
    Object.assign(player.host.style,{left:`${(rect.left-bounds.left)/scale-root.clientLeft}px`,top:`${(rect.top-bounds.top)/scale-root.clientTop}px`,width:`${rect.width/scale}px`,height:`${rect.height/scale}px`,clipPath:`inset(${Math.max(0,edge.top-rect.top)/scale}px ${Math.max(0,rect.right-edge.right)/scale}px ${Math.max(0,rect.bottom-edge.bottom)/scale}px ${Math.max(0,edge.left-rect.left)/scale}px)`})
  }
  runtime.paintDialoguePlayer=()=>{
    const player=runtime.dialoguePlayer;if(!player)return
    const media=player.media,time=Number(media.currentTime)||0,duration=Number.isFinite(media.duration)?media.duration:Number(player.payload.duration)||0,playing=!media.paused&&!media.ended
    const button=root.querySelector('[data-dialogue-play]');if(button){button.setAttribute('aria-label',playing?'Pause recording':'Play recording');button.innerHTML=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${playing?'M5 3h4v14H5zM12 3h4v14h-4z':'m6 3 11 7-11 7z'}"/></svg>`}
    const clock=root.querySelector('[data-dialogue-time]');if(clock)clock.textContent=`${dialogueTime(time)} / ${dialogueTime(duration)}`
    const seek=root.querySelector('[data-dialogue-seek]');if(seek){seek.max=String(Math.max(1,duration));if(!player.scrubbing)seek.value=String(time);seek.setAttribute('aria-valuetext',`${dialogueTime(time)} of ${dialogueTime(duration)}`)}
    const rate=root.querySelector('[data-dialogue-rate]');if(rate)rate.value=String(media.playbackRate)
    root.querySelectorAll('[data-dialogue-follow]').forEach(follow=>follow.setAttribute('aria-pressed',String(player.follow)))
    const error=root.querySelector('[data-dialogue-error]');if(error){error.hidden=!player.error;error.textContent=player.error||''}
    const active=dialogueActiveRange(player.ranges,time),id=active?.passage_id||'',changed=id!==player.activePassage
    player.activePassage=id
    root.querySelectorAll('[data-select-passage]').forEach(card=>{const current=card.dataset.selectPassage===id;card.classList.toggle('dialogue-speaking',current);if(current)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current')})
    if(changed&&id&&player.follow){const card=root.querySelector(`[data-select-passage="${CSS.escape(id)}"]`),body=card?.closest('.window-body');if(card&&body&&!card.closest('.care-pane-minimized')){const a=card.getBoundingClientRect(),b=body.getBoundingClientRect();if(a.top<b.top+24||a.bottom>b.bottom-24){const scale=(b.height/Number(body.offsetHeight))||1;body.scrollTop+=((a.top-b.top)-b.height*.25)/scale}}}
    const cue=dialogueActiveRange(player.cues,time),caption=root.querySelector('[data-dialogue-caption]'),speaker=root.querySelector('[data-dialogue-speaker]')
    if(caption)caption.textContent=cue?.text||(id?player.passageText.get(id):'')||'The transcript follows as the recording plays.'
    if(speaker)speaker.textContent=cue?.speaker_label?`TRANSCRIPT · ${cue.speaker_label}`:'TRANSCRIPT'
    const contribution=root.querySelector('[data-dialogue-contribution]')
    if(contribution){const frame=dialogueContributionFrame(player.payload.contributions,time),active=frame.phase==='IN THIS MOMENT'?frame.entries:[],ids=new Set(active.map(row=>String(row.contribution.id))),frameKey=JSON.stringify([...ids]);contribution.querySelectorAll('[data-dialogue-contribution-id]').forEach(card=>card.classList.toggle('dialogue-speaking',ids.has(card.dataset.dialogueContributionId)));const status=contribution.querySelector('[data-dialogue-exchange-status]');if(status)status.textContent=player.follow?(active.length?'Following the recording':'Browse all saved contributions'):'Reading freely';if(player.follow&&active.length&&contribution.dataset.frame!==frameKey){const card=contribution.querySelector(`[data-dialogue-contribution-id="${CSS.escape(String(active[0].contribution.id))}"]`);if(card){const section=card.closest('details');if(section)section.open=true;const a=card.getBoundingClientRect(),b=contribution.getBoundingClientRect(),scale=(b.height/Number(contribution.offsetHeight))||1;contribution.scrollTop+=(a.top-b.top-b.height*.18)/scale}}contribution.dataset.frame=frameKey}
    if(Math.abs(time-player.savedAt)>=5){player.savedAt=time;save()}
  }
  runtime.mountDialoguePlayer=()=>{
    const payload=dialogueMedia(runtime.data)
    if(!payload){runtime.disposeDialoguePlayer();return}
    const id=`${payload.source_id||payload.work_id||''}|${payload.url}`
    if(runtime.dialoguePlayer?.id!==id){
      runtime.disposeDialoguePlayer()
      const host=root.ownerDocument.createElement('div'),media=root.ownerDocument.createElement(payload.kind)
      host.className='dialogue-media-host';host.dataset.dialogueMediaHost='';host.append(media);root.append(host)
      media.controls=true;media.preload='metadata';media.setAttribute('playsinline','');media.setAttribute('aria-label',payload.title||'Recording');media.src=payload.url
      let saved={};try{saved=JSON.parse(view?.sessionStorage?.getItem(`care-dialogue-playback/1:${id}`)||'{}')}catch(_){}
      const thinker=saved.thinker?{id:String(saved.thinker.id||''),follow:saved.thinker.follow!==false,mode:saved.thinker.mode==='care'?'care':'comparison',wb:String(saved.thinker.wb||''),match:''}:null
      const player={id,host,media,payload,follow:saved.follow!==false,thinker,ranges:[],cues:[],passageText:new Map(),activePassage:'',savedAt:0,pendingTime:Math.max(0,Number(saved.time)||0),error:''};runtime.dialoguePlayer=player
      media.playbackRate=[.75,1,1.25,1.5,1.75,2].includes(Number(saved.rate))?Number(saved.rate):1
      media.addEventListener('loadedmetadata',()=>{if(runtime.dialoguePlayer!==player)return;if(player.pendingTime!==null){const time=player.pendingTime;player.pendingTime=null;runtime.seekDialogue(time)}runtime.paintDialoguePlayer()})
      for(const event of ['timeupdate','play','pause','ended','durationchange','ratechange','seeked'])media.addEventListener(event,()=>{if(runtime.dialoguePlayer!==player)return;runtime.paintDialoguePlayer();if(['pause','seeked','ratechange'].includes(event))save()})
      media.addEventListener('playing',()=>{if(runtime.dialoguePlayer!==player)return;player.error='';runtime.paintDialoguePlayer()})
      media.addEventListener('error',()=>{if(runtime.dialoguePlayer!==player)return;player.error='This recording could not be played. The transcript is still available.';runtime.paintDialoguePlayer()})
    }
    const player=runtime.dialoguePlayer;player.payload=payload;player.ranges=dialogueTimingRanges(payload);player.cues=arr(payload.cues).filter(cue=>Number.isFinite(cue.start)&&Number.isFinite(cue.end)&&cue.end>cue.start).sort((a,b)=>a.start-b.start)
    player.passageText=new Map(arr(runtime.data?.stack?.active_chapter?.passages).map(row=>[String(row.id),String(row.text||'')]))
    root.dataset.dialogueReady='true'
    const byId=new Map(arr(payload.timings).map(row=>[String(row.passage_id),row]))
    root.querySelectorAll('[data-select-passage]').forEach(card=>{const timing=byId.get(card.dataset.selectPassage);if(!timing)return;const address=card.querySelector('.passage-address');if(address&&!address.querySelector('.dialogue-passage-time')){const timestamp=root.ownerDocument.createElement('span');timestamp.className='dialogue-passage-time';timestamp.textContent=`↗ ${dialogueTime(timing.start_seconds)}`;timestamp.title='Select this passage to seek the recording';address.append(timestamp)}})
    runtime.paintDialoguePlayer();runtime.positionDialoguePlayer()
  }
  runtime.onDialogueInput=event=>{if(event.target?.matches?.('[data-dialogue-seek]')){const player=runtime.dialoguePlayer;if(player){player.scrubbing=event.type==='input';runtime.seekDialogue(Number(event.target.value))}}else if(event.target?.matches?.('[data-dialogue-rate]')){if(runtime.dialoguePlayer){runtime.dialoguePlayer.media.playbackRate=Number(event.target.value);save()}}}
  const click=runtime.onClick
  runtime.onClick=event=>{
    const target=event.target,player=runtime.dialoguePlayer
    if(target?.closest?.('.dialogue-media-host'))return
    if(target?.closest?.('[data-dialogue-play]')){if(player){player.media.paused?play():pause()}return}
    if(target?.closest?.('[data-dialogue-follow]')){if(player){player.follow=!player.follow;player.activePassage='';runtime.paintDialoguePlayer();save()}return}
    if(target?.closest?.('[data-dialogue-show]')){if(runtime.readerView==='outline')runtime.setReaderView('normal');const pane=root.querySelector('[data-pane="dialogue-media"]');if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.focus('dialogue-media');runtime.positionDialoguePlayer();return}
    const moment=target?.closest?.('[data-dialogue-moment]');if(moment){runtime.seekDialogue(Number(moment.dataset.dialogueMoment));play();return}
    const premise=target?.closest?.('[data-dialogue-care-premise]');if(premise){const id=premise.dataset.dialogueCarePremise,card=root.querySelector(`[data-select-axiom="${CSS.escape(id)}"],[data-select-passage="${CSS.escape(id)}"]`);if(card){const pane=card.closest('[data-pane]'),section=card.closest('details');if(section)section.open=true;if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.selectAxiom(card);runtime.focus(pane?.dataset.pane||'source');runtime.scrollDialogueCard(card)}else runtime.api?.setTriggerValue('open_reference',id);return}
    const evidence=target?.closest?.('[data-dialogue-evidence]');if(evidence){const id=evidence.dataset.dialogueEvidence,card=root.querySelector(`[data-select-passage="${CSS.escape(id)}"]`);if(card){const pane=card.closest('[data-pane]');if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.selectAxiom(card);runtime.focus(pane?.dataset.pane||'source');runtime.scrollDialogueCard(card)}else runtime.api?.setTriggerValue('open_reference',id);return}
    return click(event)
  }
  const select=runtime.selectAxiom;runtime.selectAxiom=button=>{const id=button?.dataset?.selectPassage,player=runtime.dialoguePlayer,timing=id&&arr(player?.payload.timings).find(row=>String(row.passage_id)===id);if(timing)runtime.seekDialogue(timing.start_seconds);return select(button)}
  const outline=runtime.applyOutline;runtime.applyOutline=()=>{outline?.();runtime.positionDialoguePlayer();runtime.paintDialoguePlayer()}
  const zoom=runtime.applyTrackZoom;runtime.applyTrackZoom=()=>{zoom?.();runtime.positionDialoguePlayer()}
  const key=runtime.onKey;runtime.onKey=event=>{if(event.target?.closest?.('.dialogue-media-host'))return;return key?.(event)}
  runtime.watchDialoguePlayer=()=>{
    if(!runtime.dialoguePlayer)return ()=>{}
    root.addEventListener('scroll',runtime.positionDialoguePlayer,true);root.addEventListener('input',runtime.onDialogueInput);root.addEventListener('change',runtime.onDialogueInput)
    const resize=view?.ResizeObserver?new view.ResizeObserver(runtime.positionDialoguePlayer):null;resize?.observe(root);const strip=root.querySelector('[data-strip]');if(strip)resize?.observe(strip);const slot=root.querySelector('[data-dialogue-media-slot]');if(slot)resize?.observe(slot)
    view?.addEventListener('pagehide',save)
    return ()=>{save();root.removeEventListener('scroll',runtime.positionDialoguePlayer,true);root.removeEventListener('input',runtime.onDialogueInput);root.removeEventListener('change',runtime.onDialogueInput);resize?.disconnect();view?.removeEventListener('pagehide',save);view?.setTimeout(()=>{if(!root.isConnected)runtime.disposeDialoguePlayer()},0)}
  }
  setupDialogueThinkers(runtime)
}

const dialogueThinkers=data=>dialogueMedia(data)?arr(data.dialogue_media.thinker_comparisons):[]
function dialogueThinkerPane(data){
  if(!dialogueThinkers(data).length)return ''
  return '<section class="desk-window care-pane dialogue-thinker-pane" data-pane="dialogue-thinkers" data-layer="THINKERS" style="--pane-accent:#73578c"><div class="window-titlebar"><strong>THINKERS / Saved comparisons</strong></div><div class="window-body" data-dialogue-thinker-body></div></section>'
}
function dialogueWBPane(data){
  if(!dialogueThinkers(data).some(run=>arr(run.wb_sources).length))return ''
  return '<section class="desk-window care-pane dialogue-wb-pane" data-pane="dialogue-wb" data-layer="WB" style="--pane-accent:#a26558"><div class="window-titlebar"><strong>WB / Saved comparison source</strong></div><div class="window-body" data-dialogue-wb-body></div></section>'
}
function dialogueThinkerStatements(run,mode='comparison'){
  const care=arr(run?.care?.sections).flatMap(section=>arr(section.items).map(item=>({...item,desk_id:`care:${item.id}`})))
  const comparison=arr(run?.comparisons).map(item=>({...item,desk_id:`comparison:${item.id}`})),speakers=arr(run?.speaker_reconstructions).map((item,index)=>({...item,desk_id:`speaker:${index}`}))
  return mode==='care'?[...care,...comparison,...speakers]:[...comparison,...speakers,...care]
}
function dialogueThinkerMatch(runs,time,mode='comparison'){
  const matches=[]
  for(const run of runs)for(const statement of dialogueThinkerStatements(run,mode))for(const range of arr(statement.ranges))if(Number(range.start_seconds)<=time&&time<Number(range.end_seconds))matches.push({run,statement,start:Number(range.start_seconds),end:Number(range.end_seconds)})
  const rank=row=>row.statement.desk_id.startsWith(mode==='care'?'care:':'comparison:')?0:row.statement.desk_id.startsWith('speaker:')?2:1
  return matches.sort((a,b)=>rank(a)-rank(b)||(a.end-a.start)-(b.end-b.start)||b.start-a.start)[0]||null
}
function dialogueTraceNote(item){
  const status=item?.trace_status,gaps=arr(item?.trace_gaps)
  if(!status&&!gaps.length||status?.status==='resolved'&&!gaps.length)return ''
  if(status?.status==='deeper_route'&&gaps.every(gap=>gap.reason==='outside_snapshot'))return '<p class="dialogue-trace-status" data-trace-status="deeper_route">Preserved routes available · continue in Routes to follow the original sources.</p>'
  const label=status?.has_evidence?'Some source traces are unavailable':'No verified source trace'
  return gaps.length?`<details class="dialogue-trace-status"><summary>${label}</summary>${gaps.map(gap=>`<p>${esc(gap.label||gap.id||'Source trace')}${gap.reason?` · ${esc(gap.reason)}`:''}</p>`).join('')}</details>`:`<p class="dialogue-trace-status">${label}</p>`
}
function dialogueThinkerEvidence(item,run){
  const passages=arr(item.passage_ids),books=[...new Map(arr(item.wb_evidence).map(ref=>[`${ref.unit_id}:${ref.care_item_id}`,ref])).values()],careIds=new Set(arr(run?.care?.sections).flatMap(section=>arr(section.items).map(row=>String(row.id))))
  const premises=arr(item.resolved_source_trace).filter(id=>careIds.has(String(id)))
  return `<div class="dialogue-thinker-evidence">${passages.map((passage,index)=>`<button type="button" data-dialogue-evidence="${esc(passage)}">Read the transcript${passages.length>1?` · ${index+1}`:''} ↗</button>`).join('')}${books.map(ref=>`<button type="button" data-dialogue-wb-evidence="${esc(ref.unit_id)}" data-dialogue-wb-item="${esc(ref.care_item_id)}" title="${esc(ref.quote||'Read this original saved whole-book CARE item')}">Read WB · ${esc(ref.care_item_id)} ↗</button>`).join('')}${premises.map(id=>`<button type="button" data-dialogue-thinker-premise="${esc(id)}">Premise · ${esc(id)} ↗</button>`).join('')}</div>${dialogueTraceNote(item)}`
}
function dialogueThinkerComparisonVoice(item){
  if(item.speaker_id||(item.speaker_id===undefined&&item.speaker_name))return item.speaker_name||'Speaker'
  const attribution=dialogueThinkerDisplayAttribution(item)
  if(attribution)return dialogueAttributionVoice(attribution)
  const segment=arr(item.dialogue_evidence)[0]?.segment_id
  return `Unattributed passage${segment?` · ${segment}`:''}`
}
function dialogueThinkerDisplayAttribution(item){
  const attribution=item.display_attribution
  return !item.speaker_id&&!(item.speaker_id===undefined&&item.speaker_name)&&item.perspective!=='library'&&(attribution?.speaker_id||attribution?.context_name===true&&attribution.source==='context_review'||attribution?.mixed&&arr(attribution.speaker_ids).length>=(attribution.partial?1:2))&&attribution.speaker_name?attribution:null
}
function dialogueAttributionVoice(attribution){return attribution.partial?'Includes '+attribution.speaker_name+' · other voices unconfirmed':(attribution.mixed?'Exchange: ':'')+attribution.speaker_name}
function dialogueAttributionNote(attribution){return attribution.source==='context_review'?'provisional · from transcript context':`${attribution.attribution_status==='confirmed'?'confirmed':'provisional'} attribution${attribution.source==='exchange'?' · from Exchange':attribution.source==='care'?' · from CARE reading':''}`}
function dialogueAttributionBasis(attribution){return attribution?.basis?`<details class="dialogue-attribution-basis"><summary>Attribution basis</summary><p>${esc(attribution.basis)}</p></details>`:''}
function dialogueThinkerAttributionNote(item){
  const attribution=dialogueThinkerDisplayAttribution(item),status=attribution?.attribution_status||item.attribution_status
  return attribution?dialogueAttributionNote(attribution):status==='provisional'?'provisional attribution':''
}
function dialogueThinkerCareVoice(item){
  if(item.perspective==='library')return 'Library reconstruction'
  if(item.speaker_id||dialogueThinkerDisplayAttribution(item))return (item.perspective==='comparison'?'Comparison reconstruction · ':'')+dialogueThinkerComparisonVoice(item)
  return item.perspective==='speaker'?item.speaker_name||'Speaker':'Comparison reconstruction'
}
function dialogueThinkerComparison(run){
  const corpus=run.corpus_reconstruction||{},name=run.thinker?.name||'Thinker'
  return `<div class="dialogue-thinker-copy"><small>IN THE LIBRARY’S WHOLE-BOOK CARE</small><h2>${esc(name)}</h2><p>${esc(corpus.summary||run.summary||'')}</p>${arr(corpus.claims).map(item=>`<article class="dialogue-thinker-statement"><p>${esc(item.text)}</p>${dialogueThinkerEvidence(item,run)}</article>`).join('')}${arr(run.speaker_reconstructions).map((item,index)=>`<article class="dialogue-thinker-statement" data-dialogue-thinker-statement="speaker:${index}"><small>IN THIS CONVERSATION${item.attribution_status==='provisional'?' · PROVISIONAL ATTRIBUTION':''}</small><h3>${esc(item.speaker_name||'Speaker')}</h3><p>${esc(item.summary)}</p>${item.how_invoked?`<small>HOW THE THINKER IS USED</small><p>${esc(item.how_invoked)}</p>`:''}${item.why_invoked?`<small>WHAT THIS DOES IN THE EXCHANGE</small><p>${esc(item.why_invoked)}</p><p class="dialogue-thinker-note">${item.purpose_status==='explicit'?'Purpose stated in the conversation':item.purpose_status==='inferred'?'Purpose inferred by this reading':'Purpose remains unclear'}</p>`:''}${dialogueThinkerEvidence(item,run)}</article>`).join('')}${arr(run.comparisons).map(item=>`<article class="dialogue-thinker-statement" data-dialogue-thinker-statement="comparison:${esc(item.id)}"><small>${esc(String(item.dimension||'Comparison').replaceAll('_',' '))} · ${esc(dialogueThinkerComparisonVoice(item))}${dialogueThinkerAttributionNote(item)?` · ${esc(dialogueThinkerAttributionNote(item))}`:''}</small>${dialogueAttributionBasis(dialogueThinkerDisplayAttribution(item))}<h3>${esc(item.title)}</h3><p>${esc(item.account)}</p>${dialogueThinkerEvidence(item,run)}</article>`).join('')}${run.scope_notice?`<p class="dialogue-thinker-note">${esc(run.scope_notice)}</p>`:''}${arr(run.limits).length?`<details><summary>Scope and limits</summary>${arr(run.limits).map(text=>`<p class="dialogue-thinker-note">${esc(text)}</p>`).join('')}</details>`:''}</div>`
}
function dialogueThinkerCare(run){
  const sections=arr(run.care?.sections)
  return `<header class="care-head"><span class="pane-kicker">COMPARISON CARE</span><h2>${esc(run.thinker?.name||'Thinker')}</h2><p>${esc(run.summary||'')}</p></header><div class="care-sections">${sections.map((section,index)=>`<details class="care-section"${index===0?' open':''}><summary><span>${esc(section.number||index+1)} · ${esc(section.title)}</span><small>${arr(section.items).length}</small></summary><div class="axiom-list">${arr(section.items).map(item=>`<article class="dialogue-thinker-statement" data-dialogue-thinker-statement="care:${esc(item.id)}"><small>${esc(item.id)} · ${esc(dialogueThinkerCareVoice(item))}${dialogueThinkerAttributionNote(item)?` · ${esc(dialogueThinkerAttributionNote(item))}`:''}</small>${dialogueAttributionBasis(dialogueThinkerDisplayAttribution(item))}<p class="dialogue-exchange-text">${esc(item.text)}</p>${dialogueThinkerEvidence(item,run)}</article>`).join('')}</div></details>`).join('')||'<p class="dialogue-pane-intro">This saved comparison has no CARE sheet.</p>'}</div>`
}
function dialogueWBContent(run,source){
  if(!source)return '<div class="dialogue-thinker-copy"><p>No whole-book source was saved for this comparison.</p></div>'
  const groups=new Map();for(const item of arr(source.record?.items)){const key=String(item.section_number||'');if(!groups.has(key))groups.set(key,{name:item.section_name||'Whole-book CARE',number:key,items:[]});groups.get(key).items.push(item)}
  const pin=source.pin?.revision_id||source.revision_id||''
  return `<div class="dialogue-wb-controls"><label for="dialogue-wb-select">Original WB</label><select id="dialogue-wb-select" data-dialogue-wb-select aria-label="Saved whole-book source">${arr(run.wb_sources).map(book=>`<option value="${esc(book.unit_id)}"${book.unit_id===source.unit_id?' selected':''}>${esc(book.title||book.unit_id)}</option>`).join('')}</select></div><header class="care-head"><span class="pane-kicker">SAVED WHOLE-BOOK CARE</span><h2>${esc(source.title||source.unit_id)}</h2><p>${esc(source.author||'')}${pin?` · saved revision ${esc(pin)}`:''}</p>${source.route_available===false&&source.route_reason?`<p class="dialogue-thinker-note">Full route unavailable · ${esc(source.route_reason)}</p>`:''}</header>${groups.size?`<div class="care-sections">${[...groups.values()].map((group,index)=>`<details class="care-section"${index===0?' open':''}><summary><span>${esc(group.number)} · ${esc(group.name)}</span><small>${group.items.length}</small></summary><div class="axiom-list">${group.items.map(item=>`<article class="dialogue-wb-item" tabindex="-1" data-dialogue-wb-snapshot-item="${esc(item.care_item_id||item.local_id)}" data-dialogue-wb-local-id="${esc(item.local_id||'')}"><span class="axiom-id">${esc(item.care_item_id||item.local_id)}</span><p>${esc(item.item_text||'')}</p>${dialogueTraceNote(item)}${dialogueWBRouteButton(run,source,item)}</article>`).join('')}</div></details>`).join('')}</div>`:`<div class="dialogue-wb-markdown">${esc(source.markdown||'This saved source has no readable text.')}</div>`}`
}
function dialogueWBRouteButton(run,source,item){
  const direct=arr(item.resolved_source_trace),distant=arr(item.resolved_deep_source_trace).filter(id=>!direct.includes(id)),links=(ids,label)=>ids.map(id=>`<button type="button" data-dialogue-wb-evidence="${esc(source.unit_id)}" data-dialogue-wb-item="${esc(id)}">${label} · ${esc(id)} ↗</button>`).join('')
  return `<div class="dialogue-thinker-evidence">${links(direct,'Premise')}${links(distant,'Recorded ancestor')}${item.route_available===true?`<button type="button" data-dialogue-wb-route="${esc(item.care_item_id)}" data-dialogue-route-run="${esc(run.id)}" data-dialogue-route-unit="${esc(source.unit_id)}">Open Routes ↗</button>`:''}</div>`
}
function setupDialogueThinkers(runtime){
  const root=runtime.root
  runtime.paintDialogueThinkers=()=>{
    const player=runtime.dialoguePlayer,runs=dialogueThinkers(runtime.data),body=root.querySelector('[data-dialogue-thinker-body]');if(!player||!body||!runs.length)return
    const state=player.thinker||(player.thinker={id:runs[0].id,follow:true,mode:'comparison',wb:'',match:''}),time=Number(player.media.currentTime)||0
    const match=dialogueThinkerMatch(runs,time,state.mode)
    if(state.follow&&match)state.id=match.run.id
    const run=runs.find(row=>row.id===state.id)||runs[0];state.id=run.id
    const frame=`${run.id}|${state.mode}`,selectedMatch=match?.run.id===run.id?match:null
    let controlsChanged=false
    if(body.dataset.frame!==frame){body.innerHTML=`<div class="dialogue-thinker-controls"><select data-dialogue-thinker-select aria-label="Saved thinker comparison">${runs.map(row=>`<option value="${esc(row.id)}"${row.id===run.id?' selected':''}>${esc(row.thinker?.name||'Thinker')}</option>`).join('')}</select><button type="button" data-dialogue-thinker-follow aria-pressed="${state.follow}">Follow recording</button><button type="button" data-dialogue-thinker-mode="comparison" aria-pressed="${state.mode==='comparison'}">Comparison</button><button type="button" data-dialogue-thinker-mode="care" aria-pressed="${state.mode==='care'}">CARE</button><small data-dialogue-thinker-phase></small></div>${state.mode==='care'?dialogueThinkerCare(run):dialogueThinkerComparison(run)}`;body.dataset.frame=frame;body.scrollTop=0;controlsChanged=true;state.match='';const title=body.closest('[data-pane]')?.querySelector('.window-titlebar strong');if(title)title.textContent=`THINKERS / ${run.thinker?.name||'Saved comparison'}`}
    const follow=body.querySelector('[data-dialogue-thinker-follow]');follow?.setAttribute('aria-pressed',String(state.follow))
    const phase=body.querySelector('[data-dialogue-thinker-phase]');if(phase)phase.textContent=!state.follow?'Reading selected thinker':selectedMatch?`From this passage · ${dialogueTime(selectedMatch.start)}`:state.match?'Last matched passage':'Saved comparison · waiting for a matched passage'
    const activeId=state.follow?selectedMatch?.statement.desk_id||'':''
    body.querySelectorAll('[data-dialogue-thinker-statement]').forEach(card=>card.classList.toggle('dialogue-speaking',Boolean(activeId&&card.dataset.dialogueThinkerStatement===activeId)))
    if(activeId&&activeId!==state.match){const card=body.querySelector(`[data-dialogue-thinker-statement="${CSS.escape(activeId)}"]`);if(card){const section=card.closest('details');if(section)section.open=true;const a=card.getBoundingClientRect(),b=body.getBoundingClientRect(),scale=(b.height/Number(body.offsetHeight))||1;body.scrollTop+=(a.top-b.top-b.height*.2)/scale}state.match=activeId}
    const sources=arr(run.wb_sources),preferred=state.follow&&selectedMatch?arr(selectedMatch.statement.wb_evidence)[0]?.unit_id:''
    const source=sources.find(row=>row.unit_id===(preferred||state.wb))||sources[0];state.wb=source?.unit_id||''
    const wbBody=root.querySelector('[data-dialogue-wb-body]'),wbFrame=`${run.id}|${state.wb}`
    if(wbBody&&wbBody.dataset.frame!==wbFrame){wbBody.innerHTML=dialogueWBContent(run,source);wbBody.dataset.frame=wbFrame;wbBody.scrollTop=0;controlsChanged=true;const title=wbBody.closest('[data-pane]')?.querySelector('.window-titlebar strong');if(title)title.textContent=`WB / ${source?.title||'Saved comparison source'}`}
    if(controlsChanged&&typeof installPaneControls==='function'){installPaneControls(root,runtime.paneControlState||(runtime.paneControlState={}),()=>{runtime.queueTrackZoom?.();runtime.positionDialoguePlayer?.()},String(runtime.data?.stack?.work?.id||''));runtime.queueTrackZoom?.();runtime.paintFocus?.()}
  }
  const paint=runtime.paintDialoguePlayer;runtime.paintDialoguePlayer=()=>{paint();runtime.paintDialogueThinkers()}
  const input=runtime.onDialogueInput;runtime.onDialogueInput=event=>{
    const state=runtime.dialoguePlayer?.thinker,target=event.target
    if(state&&target?.matches?.('[data-dialogue-thinker-select]')){state.id=target.value;state.follow=false;state.wb='';state.match='';runtime.paintDialogueThinkers();return}
    if(state&&target?.matches?.('[data-dialogue-wb-select]')){state.wb=target.value;state.follow=false;runtime.paintDialogueThinkers();return}
    return input(event)
  }
  const click=runtime.onClick;runtime.onClick=event=>{
    const target=event.target,state=runtime.dialoguePlayer?.thinker
    if(state&&target?.closest?.('[data-dialogue-thinker-follow]')){state.follow=!state.follow;state.match='';runtime.paintDialogueThinkers();return}
    const mode=target?.closest?.('[data-dialogue-thinker-mode]');if(state&&mode){state.mode=mode.dataset.dialogueThinkerMode;state.match='';runtime.paintDialogueThinkers();return}
    const premise=target?.closest?.('[data-dialogue-thinker-premise]');if(state&&premise){state.follow=false;state.mode='care';runtime.paintDialogueThinkers();const pane=root.querySelector('[data-pane="dialogue-thinkers"]'),card=pane?.querySelector(`[data-dialogue-thinker-statement="${CSS.escape('care:'+premise.dataset.dialogueThinkerPremise)}"]`);if(card){const section=card.closest('details');if(section)section.open=true;card.setAttribute('tabindex','-1');card.focus({preventScroll:true});runtime.scrollDialogueCard(card)}return}
    const route=target?.closest?.('[data-dialogue-wb-route]');if(route){if(state)state.follow=false;runtime.api?.setTriggerValue('connection_action',{action:'dialogue_wb_route',run_id:route.dataset.dialogueRouteRun,unit_id:route.dataset.dialogueRouteUnit,reference_id:route.dataset.dialogueWbRoute});return}
    const evidence=target?.closest?.('[data-dialogue-wb-evidence]');if(state&&evidence){state.wb=evidence.dataset.dialogueWbEvidence;state.follow=false;runtime.paintDialogueThinkers();const pane=root.querySelector('[data-pane="dialogue-wb"]');if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click();runtime.focus('dialogue-wb');const id=evidence.dataset.dialogueWbItem,local=id.startsWith(state.wb+':')?id.slice(state.wb.length+1):id;const card=[...(pane?.querySelectorAll('[data-dialogue-wb-snapshot-item]')||[])].find(row=>[id,local,`${state.wb}:${local}`].includes(row.dataset.dialogueWbSnapshotItem)||row.dataset.dialogueWbLocalId===local);pane?.querySelectorAll('.dialogue-evidence-active').forEach(row=>row.classList.remove('dialogue-evidence-active'));if(card){const section=card.closest('details');if(section)section.open=true;card.classList.add('dialogue-evidence-active');card.focus({preventScroll:true});runtime.scrollDialogueCard(card)}return}
    return click(event)
  }
}


const originalAwarenessList=value=>Array.isArray(value)?value:[]
const originalAwarenessIndexes=new WeakMap()
function originalAwarenessWords(text){
  return String(text||'').normalize('NFKC').toLocaleLowerCase()
    .replace(/\u00ad/g,'').replace(/(\p{L})[-‐]\s*\n\s*(\p{L})/gu,'$1$2')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean)
}
function originalAwarenessPhrases(text){
  const words=originalAwarenessWords(text),phrases=new Set()
  // A page number, short heading, or common fragment is not evidence that a
  // registered passage is visible. Keep substantial contiguous wording only.
  for(let index=0;index+8<=words.length;index++){
    const phrase=words.slice(index,index+8),letters=phrase.filter(word=>/\p{L}/u.test(word))
    if(letters.length>=6&&new Set(letters).size>=4&&letters.join('').length>=36)phrases.add(phrase.join(' '))
  }
  return phrases
}
function originalAwarenessRelated(stack,passageIds){
  const passages=originalAwarenessList(stack?.active_chapter?.passages),requested=new Set(originalAwarenessList(passageIds).map(String))
  const matched=passages.filter(passage=>requested.has(String(passage.id))),related=new Set(matched.map(passage=>String(passage.id)))
  const items=new Map()
  for(const unit of originalAwarenessList(stack?.care_path)){
    for(const item of [...originalAwarenessList(unit.items),...originalAwarenessList(unit.sections).flatMap(section=>originalAwarenessList(section.items))]){
      if(item?.id&&!items.has(String(item.id)))items.set(String(item.id),item)
    }
  }
  for(const passage of matched)for(const item of originalAwarenessList(passage.axioms))if(items.has(String(item.id)))related.add(String(item.id))
  // Walk only saved item-to-item relationships in the current chapter's CARE
  // panes. Neither neighbouring positions nor unregistered labels make links.
  let changed=true
  while(changed){
    changed=false
    for(const [id,item] of items){
      if(related.has(id))continue
      const references=[...originalAwarenessList(item.passage_trace_ids),...originalAwarenessList(item.source_trace),...originalAwarenessList(item.deep_source_trace),...originalAwarenessList(item.matrix_trace)]
      if(references.some(reference=>related.has(String(reference)))){related.add(id);changed=true}
    }
  }
  return {passage_ids:matched.map(passage=>String(passage.id)),item_ids:[...items.keys()].filter(id=>related.has(id))}
}
function originalAwarenessIndex(stack){
  if(!stack||typeof stack!=='object')return new Map()
  const saved=originalAwarenessIndexes.get(stack);if(saved)return saved
  const owners=new Map()
  // Payload stacks are immutable. Build the chapter's phrase ownership once;
  // a new payload gets its own index, and discarded stacks can be collected.
  for(const passage of originalAwarenessList(stack?.active_chapter?.passages)){
    for(const phrase of originalAwarenessPhrases(passage.text)){
      if(!owners.has(phrase))owners.set(phrase,new Set())
      owners.get(phrase).add(String(passage.id))
    }
  }
  originalAwarenessIndexes.set(stack,owners)
  return owners
}
function originalAwarenessMatches(stack,text){
  const visible=originalAwarenessPhrases(text)
  if(!visible.size)return {passage_ids:[],item_ids:[]}
  const owners=originalAwarenessIndex(stack)
  const ids=new Set()
  // Repeated boilerplate shared by several passages cannot identify one.
  for(const phrase of visible){const passages=owners.get(phrase);if(passages?.size===1)ids.add([...passages][0])}
  return originalAwarenessRelated(stack,[...ids])
}
function originalPaintAwareness(runtime,passageIds,{scroll=true}={}){
  const root=runtime.root,stack=runtime.data?.stack,matched=originalAwarenessRelated(stack,passageIds)
  const passages=new Set(matched.passage_ids),items=new Set(matched.item_ids),bodies=new Map()
  for(const card of root.querySelectorAll('.original-awareness'))card.classList.remove('original-awareness')
  for(const card of root.querySelectorAll('[data-select-passage],[data-select-axiom]')){
    if(card.closest('[data-connection-book],[data-connection-field]'))continue
    const passage=card.dataset.selectPassage,active=passage
      ?passages.has(passage)&&String(card.dataset.sourceUnit||'')===String(stack?.active_chapter?.raw_unit_id||'')
      :items.has(card.dataset.selectAxiom)
    if(!active)continue
    card.classList.add('original-awareness')
    if(!scroll||card.closest('[hidden],.care-pane-minimized'))continue
    const body=card.closest('.window-body')
    if(body&&!bodies.has(body))bodies.set(body,card)
  }
  for(const [body,card] of bodies){
    const section=card.closest('details');if(section)section.open=true
    const bounds=body.getBoundingClientRect(),rect=card.getBoundingClientRect()
    const scale=Number(body.clientHeight)>0?bounds.height/body.clientHeight:1
    if(!Number.isFinite(scale)||scale<=0||!bounds.height)continue
    const margin=Math.min(36*scale,bounds.height*.1),bottom=bounds.top+bounds.height
    // Change only the pane's own vertical offset. scrollIntoView would also
    // drag the original source or another pane out of the horizontal viewport.
    if(rect.top<bounds.top+margin||rect.top+Math.min(rect.height,bounds.height-2*margin)>bottom-margin){
      body.scrollTop=Math.max(0,body.scrollTop+(rect.top-bounds.top-margin)/scale)
    }
  }
  return matched
}


const originalAnnotationSources=new WeakMap()
const originalAnnotationText=node=>originalAnnotationSources.get(node)??node?.textContent??''
function originalAnnotationItems(stack){
  const items=new Map()
  for(const unit of originalAwarenessList(stack?.care_path)){
    for(const item of [...originalAwarenessList(unit.items),...originalAwarenessList(unit.sections).flatMap(section=>originalAwarenessList(section.items))]){
      if(!item?.id||items.has(String(item.id)))continue
      const layer=String(unit.type||item.layer||'').toUpperCase()
      items.set(String(item.id),{...item,id:String(item.id),unit_id:String(unit.id||item.unit_id||''),layer,identity:unit})
    }
  }
  return items
}
function originalAnnotationGroups(stack,page,kind){
  if(!stack||!page?.node)return []
  const items=originalAnnotationItems(stack),seen=new Set(),groups=[]
  const copy=['epub','text'].includes(kind)?page.node.querySelector('.original-edition-copy'):null
  // Read only source text. A margin tooltip must never become new evidence.
  const blocks=copy?[...copy.querySelectorAll('p,li,blockquote,h1,h2,h3,h4,h5,h6,td,figcaption')].filter(node=>!node.querySelector('p,li,blockquote,td,figcaption')):[]
  const candidates=kind==='pdf'?[{node:page.node,text:page.text||''}]:blocks.map(node=>({node,text:originalAnnotationText(node)}))
  for(const candidate of candidates){
    const matched=originalAwarenessMatches(stack,candidate.text)
    const related=matched.item_ids.map(id=>items.get(id)).filter(item=>item&&item.unit_id&&!seen.has(item.id))
    if(!related.length)continue
    related.forEach(item=>seen.add(item.id))
    groups.push({node:candidate.node,passage_ids:matched.passage_ids,items:related,scope:kind==='pdf'?'page':'passage'})
  }
  return groups
}
function setupOriginalAnnotations(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView,records=new WeakMap()
  let leaveTimer=null
  const cancelLeave=()=>{if(leaveTimer!==null){view.clearTimeout(leaveTimer);leaveTimer=null}}
  const clear=page=>{
    page?.node?.querySelectorAll?.('.original-annotation-rail').forEach(node=>node.remove())
    page?.node?.querySelectorAll?.('.original-annotation-anchor').forEach(node=>node.classList.remove('original-annotation-anchor'))
    if(page?.node?.dataset)delete page.node.dataset.originalAnnotated
  }
  runtime.originalAnnotatePage=id=>{
    const state=runtime.originalState,stack=runtime.data?.stack,payload=stack?.original_reader,page=state?.pages?.get(id)
    if(!page?.node||!payload)return
    // Stack identity is the revision boundary for evidence and saved links.
    const copy=['epub','text'].includes(payload.kind)?page.node.querySelector('.original-edition-copy'):null
    if(page.annotationStack===stack&&page.annotationText===page.text&&page.annotationCopy===copy)return
    clear(page);page.annotationStack=stack;page.annotationText=page.text;page.annotationCopy=copy
    const location=originalAwarenessList(payload.locations).find(item=>String(item.id)===String(id))
    const chapters=new Set([...originalAwarenessList(location?.raw_unit_ids),location?.raw_unit_id].filter(Boolean).map(String))
    if(!chapters.has(String(stack.active_chapter?.raw_unit_id||stack.active_raw_unit_id||'')))return
    const groups=originalAnnotationGroups(stack,page,payload.kind)
    if(copy&&!originalAnnotationSources.has(copy))originalAnnotationSources.set(copy,copy.textContent||'')
    for(const group of groups){
      const rail=root.ownerDocument.createElement('span');rail.className='original-annotation-rail';rail.setAttribute('role','group')
      rail.setAttribute('aria-label',group.scope==='page'?`CARE links on ${location?.label||'this page'}`:'CARE links for this passage')
      if(!originalAnnotationSources.has(group.node))originalAnnotationSources.set(group.node,group.node.textContent||'')
      const layerMenus=new Map()
      if(group.items.length>8){
        for(const item of group.items){
          const label=typeof readerLayerLabel==='function'?readerLayerLabel(item.layer,item.identity):item.layer
          if(!layerMenus.has(label)){
            const cluster=root.ownerDocument.createElement('span'),trigger=root.ownerDocument.createElement('button'),menu=root.ownerDocument.createElement('span')
            cluster.className='original-annotation-cluster';trigger.type='button';trigger.className='original-annotation-dot';trigger.dataset.originalLayer=label
            trigger.style.setProperty('--original-note-accent',layerColor(item.layer,item.identity));trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','true')
            menu.className='original-annotation-menu';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label',label+' axioms')
            cluster.append(trigger);cluster.append(menu);rail.append(cluster);layerMenus.set(label,{trigger,menu,count:0})
          }
        }
      }
      for(const item of group.items){
        const dot=root.ownerDocument.createElement('button'),layer=typeof readerLayerLabel==='function'?readerLayerLabel(item.layer,item.identity):item.layer
        const scope=group.scope==='page'?'Page link':'Passage link',excerpt=String(item.text||item.title||item.id).replace(/\s+/g,' ').trim()
        const label=`${layer} · ${scope} · ${excerpt.length>150?excerpt.slice(0,147)+'…':excerpt}`
        dot.type='button';dot.className='original-annotation-dot';dot.dataset.originalAxiom=item.id;dot.dataset.originalNote=label
        dot.style.setProperty('--original-note-accent',layerColor(item.layer,item.identity))
        dot.setAttribute('aria-label',`Open ${layer} axiom ${item.id} · ${scope} · ${excerpt}`)
        dot.setAttribute('aria-pressed',String(runtime.selectedAxiom?.axiom_id===item.id&&runtime.selectedAxiom?.unit_id===item.unit_id))
        dot.title=label
        records.set(dot,{stack,item,location:id,passage_ids:group.passage_ids})
        const cluster=layerMenus.get(layer)
        if(cluster){
          cluster.count++;dot.className='original-annotation-item';dot.textContent=excerpt;dot.title=item.id
          cluster.menu.append(dot);cluster.trigger.setAttribute('aria-label',`View ${cluster.count} ${layer} axioms`)
          cluster.trigger.dataset.originalNote=`${layer} · ${cluster.count} linked axioms`;cluster.trigger.title=cluster.trigger.dataset.originalNote
        }else rail.append(dot)
      }
      if(group.node!==page.node)group.node.classList.add('original-annotation-anchor')
      group.node.append(rail)
    }
    if(groups.length)page.node.dataset.originalAnnotated='true'
  }
  runtime.originalRefreshAnnotations=()=>{
    runtime.originalState?.pages?.forEach((page,id)=>runtime.originalAnnotatePage(id))
  }
  const openViewer=selection=>{
    if(!view?.CustomEvent)return false
    const detail={kind:'axiom',id:selection.axiom_id,scope:runtime.data?.viewer_scopes?.[selection.axiom_id]||''}
    const event=new view.CustomEvent('care-reference-select',{cancelable:true,detail:{...detail,open:false}})
    view.dispatchEvent(event)
    if(!event.defaultPrevented)return false
    view.dispatchEvent(new view.CustomEvent('care-reference-preview',{detail:{...detail,source:'original-reader'}}))
    runtime.originalPreviewOpen=true
    return true
  }
  runtime.originalCloseNotes=()=>{
    cancelLeave()
    let closed=false
    root.querySelectorAll('.original-annotation-menu').forEach(menu=>{if(!menu.hidden){menu.hidden=true;closed=true;menu.parentElement?.querySelector('[data-original-layer]')?.setAttribute('aria-expanded','false')}})
    return closed
  }
  runtime.originalDismissPreview=()=>{
    runtime.originalCloseNotes()
    runtime.originalAnnotationPending=null
    if(!runtime.originalPreviewOpen)return
    runtime.originalPreviewOpen=false
    view.dispatchEvent(new view.CustomEvent('care-reference-dismiss-preview',{detail:{source:'original-reader'}}))
  }
  runtime.onOriginalAnnotationBoundary=event=>{
    const rail=event.target?.closest?.('.original-annotation-rail')
    if(!rail)return
    if(event.type==='pointerover'){cancelLeave();return}
    if(rail.contains?.(event.relatedTarget))return
    cancelLeave()
    if(event.type==='focusout'){runtime.originalCloseNotes();return}
    leaveTimer=view.setTimeout(()=>{leaveTimer=null;runtime.originalCloseNotes()},250)
  }
  runtime.onOriginalAnnotationClick=event=>{
    const layer=event.target?.closest?.('[data-original-layer]')
    if(layer){
      event.preventDefault?.();event.stopPropagation?.()
      const menu=layer.parentElement?.querySelector('.original-annotation-menu'),open=menu?.hidden
      runtime.originalCloseNotes();if(menu){menu.hidden=!open;layer.setAttribute('aria-expanded',String(Boolean(open)))}
      return true
    }
    const dot=event.target?.closest?.('[data-original-axiom]');if(!dot)return false
    event.preventDefault?.();event.stopPropagation?.()
    const record=records.get(dot),stack=runtime.data?.stack
    // A delayed click after a chapter or edition change cannot select old evidence.
    if(!record||record.stack!==stack)return true
    const selection={work_id:String(stack.work?.id||''),unit_id:record.item.unit_id,axiom_id:record.item.id}
    runtime.selectedAxiom=selection;runtime.paintSelection?.();runtime.originalCloseNotes()
    root.querySelectorAll('[data-original-axiom]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.originalAxiom===selection.axiom_id)))
    if(openViewer(selection)){runtime.viewerSelectionPending=false;runtime.originalAnnotationPending=null}
    else{runtime.originalAnnotationPending=selection;runtime.viewerSelectionPending=true;runtime.api?.setStateValue('selected_axiom',selection)}
    // Leave scroll offsets, Follow, chapter navigation and keyboard focus alone.
    return true
  }
  const viewerReady=runtime.onViewerReady
  runtime.onViewerReady=()=>{
    viewerReady?.()
    const pending=runtime.originalAnnotationPending
    if(!pending)return
    if(pending.work_id!==String(runtime.data?.stack?.work?.id||'')||pending.axiom_id!==runtime.selectedAxiom?.axiom_id){runtime.originalAnnotationPending=null;return}
    if(openViewer(pending)){runtime.originalAnnotationPending=null;runtime.viewerSelectionPending=false}
  }
}


function originalReaderPayload(data){
  if(isRouteReference(data?.reference)||data?.connection?.reference||dialogueMedia(data))return null
  const source=data?.stack?.original_reader
  return source&&(['pdf','epub','text'].includes(source.kind)||source.available===false)?source:null
}
function originalLocationNoun(kind){return kind==='pdf'?'page':kind==='text'?'chapter':'section'}
function originalReadingFormats(source){return arr(source?.formats).filter(item=>['text','pdf','epub'].includes(item?.kind)&&/^\/study-original\/[A-Za-z0-9_-]+\/format\/(text|pdf|epub)$/.test(item.content_url||'')&&item.content_url.endsWith('/'+item.kind))}
function originalFormatControl(data,{expanded=false}={}){
  const source=originalReaderPayload(data),formats=originalReadingFormats(source);if(!formats.length)return ''
  const label='Original reading format: '+({text:'Text',pdf:'PDF',epub:'EPUB'}[source.kind]||'Original')
  return `<button type="button" class="desk-tab desk-bookmark-control original-format-control${expanded?' original-download-expanded':''}" data-original-format-menu aria-label="${esc(label)}" title="${esc(label)}" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5c-2-2-5-2-8-1v12c3-1 6-1 8 1 2-2 5-2 8-1V4c-3-1-6-1-8 1Zm0 0v12M5 7h2M5 10h2m6-3h2m-2 3h2"/></svg><span class="original-format-status" data-original-format-status role="status" aria-live="polite"></span></button>`
}
function originalFormatMenu(data){
  const source=originalReaderPayload(data)
  return `<strong class="build-version-menu-head">Read original as</strong><div class="build-version-options" role="menu" aria-label="Original reading format">${originalReadingFormats(source).map(item=>`<button type="button" class="build-version-option" role="menuitemradio" tabindex="-1" data-original-reading-format="${esc(item.kind)}" aria-checked="${item.kind===source.kind}"><span class="build-version-copy"><strong>${esc(item.label||({text:'Text',pdf:'PDF',epub:'EPUB'}[item.kind]))}</strong><small>${{text:'Source chapters',pdf:'PDF pages',epub:'E-reader sections'}[item.kind]}</small></span><span class="build-version-check" aria-hidden="true">${item.kind===source.kind?'✓':''}</span></button>`).join('')}</div>`
}
function originalFormatData(data,payload){return {...data,stack:{...data.stack,original_reader:payload}}}
let originalFormatSequence=0
function setupOriginalFormats(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView,entries=new Map()
  let sequence=0
  runtime.cancelOriginalFormatRequest=()=>{const request=runtime.originalFormatRequest;if(request){request.controller?.abort();request.entry.pending=null;runtime.originalFormatRequest=null};sequence++}
  runtime.prepareOriginalFormats=data=>{
    const source=originalReaderPayload(data),work=String(source?.work_id||data?.stack?.work?.id||'')
    if(!source||!work||!originalReadingFormats(source).length){runtime.cancelOriginalFormatRequest();runtime.originalFormatEntry=null;runtime.originalFormatContext='';return data}
    if(runtime.originalFormatContext!==work)runtime.cancelOriginalFormatRequest()
    let entry=entries.get(work)
    if(!entry){let preferred='';try{preferred=view.localStorage?.getItem('care-original-format/1:'+work)||''}catch(_){};entry={work,preferred,desired:preferred||source.kind,payloads:new Map(),error:'',pending:null};entries.set(work,entry)}
    if(entry.base&&entry.base.id!==source.id){runtime.cancelOriginalFormatRequest();entry.payloads.clear()}
    const formats=originalReadingFormats(source),urls=new Map(formats.map(item=>[item.kind,item.content_url]))
    for(const [kind,cached] of entry.payloads)if(cached.url!==urls.get(kind))entry.payloads.delete(kind)
    if(entry.pending&&entry.pending.url!==urls.get(entry.pending.kind))runtime.cancelOriginalFormatRequest()
    entry.base=source;entry.payloads.set(source.kind,{url:urls.get(source.kind),payload:source})
    if(!urls.has(entry.desired))entry.desired=source.kind
    runtime.originalFormatEntry=entry;runtime.originalFormatContext=work
    const payload=entry.payloads.get(entry.desired)?.payload||source
    return originalFormatData(data,{...payload,work_id:work,formats:source.formats,downloads:source.downloads})
  }
  runtime.paintOriginalFormats=()=>{
    const entry=runtime.originalFormatEntry,source=originalReaderPayload(runtime.data),pending=entry?.pending
    const message=pending?'Loading '+({text:'text',pdf:'PDF',epub:'EPUB'}[pending.kind])+'…':entry?.error||''
    const label='Original reading format: '+({text:'Text',pdf:'PDF',epub:'EPUB'}[source?.kind]||'Original')
    root.querySelectorAll('[data-original-format-menu]').forEach(button=>{button.setAttribute('aria-busy',String(Boolean(pending)));button.setAttribute('aria-label',label);button.title=message||label})
    root.querySelectorAll('[data-original-reading-format]').forEach(button=>{const checked=button.dataset.originalReadingFormat===source?.kind;button.setAttribute('aria-checked',String(checked));const check=button.querySelector('.build-version-check');if(check)check.textContent=checked?'✓':''})
    root.querySelectorAll('[data-original-format-status]').forEach(status=>{status.textContent=message})
  }
  runtime.replaceOriginalFormat=(payload,{reveal=true}={})=>{
    const pane=root.querySelector('[data-pane="original"]');if(!pane)return false
    const popup=runtime.originalFormatMenu,popupFocused=Boolean(popup?.element.querySelector(':focus'))
    const restoreFormatFocus=Boolean(pane.querySelector('[data-original-format-menu]:focus')||(popupFocused&&pane.contains?.(popup.anchor)))
    const previous=runtime.originalState,presentation={open:reveal||Boolean(previous?.open),expanded:Boolean(previous?.expanded),beforeExpand:previous?.beforeExpand,controlsMode:previous?.controlsMode||'auto'}
    const nextData=originalFormatData(runtime.data,payload),template=doc.createElement('template');template.innerHTML=originalReaderPane(nextData)
    const replacement=template.content.firstElementChild;if(!replacement)return false
    runtime.closeOriginalFormats?.({restoreFocus:popupFocused&&!restoreFormatFocus});runtime.stopOriginalReader?.();runtime.originalSave?.();runtime.closeSliderJumpMenu?.();runtime.closeOriginalDownloads?.()
    runtime.data=nextData
    pane.replaceWith(replacement)
    runtime.refreshSliders?.(replacement)
    runtime.stopOriginalReader=runtime.mountOriginalReader({sameWork:true,formatSwitch:true,presentation})
    installPaneControls(root,runtime.paneControlState||(runtime.paneControlState={}),()=>{runtime.queueTrackZoom?.();runtime.queueThreads?.()},String(runtime.data?.stack?.work?.id||''))
    runtime.renderSignature=studyDeskRenderSignature(runtime.data)
    runtime.paintOriginalFormats();runtime.queueTrackZoom?.()
    if(reveal)runtime.revealOriginal?.({follow:false})
    if(restoreFormatFocus)replacement.querySelector('[data-original-format-menu]')?.focus({preventScroll:true})
    return true
  }
  runtime.selectOriginalFormat=async (kind,{reveal=true,persist=true}={})=>{
    const entry=runtime.originalFormatEntry,source=originalReaderPayload(runtime.data),format=originalReadingFormats(entry?.base).find(item=>item.kind===kind)
    if(!entry||!source||!format)return false
    runtime.cancelOriginalFormatRequest();entry.desired=kind;entry.error=''
    const apply=payload=>{
      const chosen={...payload,work_id:entry.work,formats:entry.base.formats,downloads:entry.base.downloads}
      if(chosen.id!==originalReaderPayload(runtime.data)?.id){if(!runtime.replaceOriginalFormat(chosen,{reveal}))return false}
      else if(reveal)runtime.revealOriginal?.({follow:false})
      entry.preferred=kind;if(persist)try{view.localStorage?.setItem('care-original-format/1:'+entry.work,kind)}catch(_){}
      runtime.paintOriginalFormats();return true
    }
    const cached=entry.payloads.get(kind)
    if(cached?.url===format.content_url)return apply(cached.payload)
    const controller=view.AbortController?new view.AbortController():null,request={id:++sequence,entry,kind,url:format.content_url,controller}
    entry.pending=request;runtime.originalFormatRequest=request;runtime.paintOriginalFormats()
    const current=()=>runtime.originalFormatRequest===request&&sequence===request.id&&runtime.originalFormatEntry===entry&&runtime.originalFormatContext===entry.work&&Boolean(originalReaderPayload(runtime.data))&&root.isConnected!==false
    try{
      const url=new URL(format.content_url,view.location.href);if(url.origin!==view.location.origin)throw Error('Invalid source format')
      const response=await view.fetch(url.href,controller?{signal:controller.signal}:undefined);if(!response.ok)throw Error('Format unavailable')
      const payload=await response.json();if(!current())return false
      if(payload?.kind!==kind||String(payload.work_id)!==entry.work||!payload.id||payload.available===false||!arr(payload.locations).length)throw Error('Format unavailable')
      entry.payloads.set(kind,{url:format.content_url,payload});entry.pending=null;runtime.originalFormatRequest=null
      return apply(payload)
    }catch(error){
      if(!current())return false
      entry.pending=null;runtime.originalFormatRequest=null;entry.desired=source.kind;entry.error=({text:'Text',pdf:'PDF',epub:'EPUB'}[kind])+' unavailable. Try again.';runtime.paintOriginalFormats();return false
    }
  }
  runtime.resumeOriginalFormat=()=>{
    const entry=runtime.originalFormatEntry;runtime.paintOriginalFormats()
    if(entry&&!entry.pending&&entry.desired!==originalReaderPayload(runtime.data)?.kind)runtime.selectOriginalFormat(entry.desired,{reveal:false,persist:false})
  }
  runtime.closeOriginalFormats=({restoreFocus=false}={})=>{
    const popup=runtime.originalFormatMenu;if(!popup)return
    runtime.originalFormatMenu=null;popup.anchor.setAttribute('aria-expanded','false');popup.anchor.removeAttribute('aria-controls');popup.element.remove()
    if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})
    runtime.originalWake?.()
  }
  runtime.positionOriginalFormats=()=>{
    const popup=runtime.originalFormatMenu;if(!popup)return
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),scale=readerLayoutScale(root,bounds),width=Math.min(240,bounds.width/scale-16),top=Math.max(8,Math.min(bounds.height/scale-180,(anchor.bottom-bounds.top)/scale+8))
    Object.assign(popup.element.style,{width:width+'px',left:Math.max(8,Math.min(bounds.width/scale-width-8,(anchor.right-bounds.left)/scale-width))+'px',top:top+'px',maxHeight:Math.max(80,bounds.height/scale-top-8)+'px'})
  }
  runtime.openOriginalFormats=(anchor,{last=false}={})=>{
    const same=runtime.originalFormatMenu?.anchor===anchor
    runtime.closeOriginalFormats();if(same||!originalReadingFormats(originalReaderPayload(runtime.data)).length)return
    runtime.closeOriginalDownloads?.();runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeBookmarkMenu?.();runtime.closeSliderJumpMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement('section');element.className='build-version-menu original-text-menu original-format-menu';element.id='original-formats-'+(++originalFormatSequence);element.innerHTML=originalFormatMenu(runtime.data)
    root.append(element);runtime.originalFormatMenu={anchor,element};anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-controls',element.id);runtime.positionOriginalFormats();runtime.originalWake?.()
    const choices=[...element.querySelectorAll('[data-original-reading-format]')];(last?choices.at(-1):choices.find(button=>button.getAttribute('aria-checked')==='true')||choices[0])?.focus({preventScroll:true})
  }
  const click=event=>{
    const anchor=event.target?.closest?.('[data-original-format-menu]')
    if(anchor){event.preventDefault();runtime.openOriginalFormats(anchor);return}
    const choice=event.target?.closest?.('[data-original-reading-format]')
    if(!choice||!runtime.originalFormatMenu?.element.contains(choice))return
    event.preventDefault();runtime.closeOriginalFormats({restoreFocus:true});runtime.selectOriginalFormat(choice.dataset.originalReadingFormat)
  }
  const key=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.originalFormatMenu,anchor=event.target?.closest?.('[data-original-format-menu]')
    if(!popup&&anchor&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();runtime.openOriginalFormats(anchor,{last:event.key==='ArrowUp'});return}
    if(!popup)return key?.(event)
    event.stopPropagation?.()
    if(event.key==='Escape'){event.preventDefault();runtime.closeOriginalFormats({restoreFocus:true});return}
    if(event.key==='Tab'){runtime.closeOriginalFormats({restoreFocus:true});return}
    const choices=[...popup.element.querySelectorAll('[data-original-reading-format]')],index=choices.indexOf(event.target?.closest?.('[data-original-reading-format]'))
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?choices.length-1:(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length
      choices[next]?.focus({preventScroll:true});return
    }
    if(['Enter',' '].includes(event.key)&&index>=0){event.preventDefault();choices[index].click()}
  }
  const outside=event=>{const popup=runtime.originalFormatMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeOriginalFormats()}
  runtime.attachOriginalFormats=()=>{root.addEventListener('click',click);doc.addEventListener('pointerdown',outside,true);view?.addEventListener('resize',runtime.positionOriginalFormats);root.addEventListener('scroll',runtime.positionOriginalFormats,true)}
  runtime.cleanupOriginalFormats=()=>{runtime.closeOriginalFormats();runtime.cancelOriginalFormatRequest();root.removeEventListener('click',click);doc.removeEventListener('pointerdown',outside,true);view?.removeEventListener('resize',runtime.positionOriginalFormats);root.removeEventListener('scroll',runtime.positionOriginalFormats,true)}
}
function originalTextDownloads(data){return arr(data?.stack?.original_reader?.downloads).filter(item=>['txt','pdf','epub'].includes(item?.format)&&/^\/study-original\/[A-Za-z0-9_-]+\/download$/.test(item.url||''))}
function originalDownloadControl(data,{expanded=false}={}){
  if(!originalTextDownloads(data).length)return ''
  return `<button type="button" class="desk-tab desk-bookmark-control original-download-control${expanded?' original-download-expanded':''}" data-original-download-menu aria-label="Download original text" title="Download text · TXT, PDF or EPUB" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v10m-4-4 4 4 4-4M3 12v5h14v-5"/></svg></button>`
}
function originalDownloadMenu(data){
  return `<strong class="build-version-menu-head">Download original text</strong><div class="build-version-options" role="menu" aria-label="Original text formats">${originalTextDownloads(data).map(item=>`<a class="build-version-option" role="menuitem" tabindex="-1" data-original-download-link href="${esc(item.url)}" download="${esc(item.filename||'')}" aria-label="Download ${esc(item.label||'original text ('+item.format.toUpperCase()+')')}"><span class="build-version-copy"><strong>${esc(item.format.toUpperCase())}</strong><small>${{txt:'Plain text',pdf:'PDF document',epub:'E-reader book'}[item.format]}</small></span></a>`).join('')}</div>`
}
let originalDownloadSequence=0
function setupOriginalDownloads(runtime){
  const root=runtime.root,doc=root.ownerDocument,view=doc.defaultView
  runtime.closeOriginalDownloads=({restoreFocus=false}={})=>{
    const popup=runtime.originalDownloadMenu;if(!popup)return
    runtime.originalDownloadMenu=null;popup.anchor.setAttribute('aria-expanded','false');popup.anchor.removeAttribute('aria-controls');popup.element.remove()
    if(restoreFocus&&popup.anchor.isConnected!==false)popup.anchor.focus({preventScroll:true})
    runtime.originalWake?.()
  }
  runtime.positionOriginalDownloads=()=>{
    const popup=runtime.originalDownloadMenu;if(!popup)return
    const bounds=root.getBoundingClientRect(),anchor=popup.anchor.getBoundingClientRect(),scale=readerLayoutScale(root,bounds),width=Math.min(280,bounds.width/scale-16),top=Math.max(8,Math.min(bounds.height/scale-120,(anchor.bottom-bounds.top)/scale+8))
    Object.assign(popup.element.style,{width:width+'px',left:Math.max(8,Math.min(bounds.width/scale-width-8,(anchor.right-bounds.left)/scale-width))+'px',top:top+'px',maxHeight:Math.max(80,bounds.height/scale-top-8)+'px'})
  }
  runtime.openOriginalDownloads=(anchor,{last=false}={})=>{
    const same=runtime.originalDownloadMenu?.anchor===anchor
    runtime.closeOriginalDownloads();if(same||!originalTextDownloads(runtime.data).length)return
    runtime.closeOriginalFormats?.();runtime.closeBuildVersionMenu?.();runtime.closeSheetVersionMenu?.();runtime.closeBookmarkMenu?.();runtime.closeSliderJumpMenu?.();runtime.closeConnectionDiscovery?.()
    const element=doc.createElement('section');element.className='build-version-menu original-text-menu';element.id='original-downloads-'+(++originalDownloadSequence);element.innerHTML=originalDownloadMenu(runtime.data)
    root.append(element);runtime.originalDownloadMenu={anchor,element};anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-controls',element.id);runtime.positionOriginalDownloads();runtime.originalWake?.()
    const links=[...element.querySelectorAll('[data-original-download-link]')];(last?links.at(-1):links[0])?.focus({preventScroll:true})
  }
  const click=event=>{
    const anchor=event.target?.closest?.('[data-original-download-menu]')
    if(anchor){event.preventDefault();runtime.openOriginalDownloads(anchor);return}
    const popup=runtime.originalDownloadMenu,link=event.target?.closest?.('[data-original-download-link]')
    // Keep native link activation, including its download attribute, intact.
    if(link&&popup?.element.contains(link))view.setTimeout(()=>{if(runtime.originalDownloadMenu===popup)runtime.closeOriginalDownloads({restoreFocus:true})},0)
  }
  const key=runtime.onKey
  runtime.onKey=event=>{
    const popup=runtime.originalDownloadMenu,anchor=event.target?.closest?.('[data-original-download-menu]')
    if(!popup&&anchor&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();runtime.openOriginalDownloads(anchor,{last:event.key==='ArrowUp'});return}
    if(!popup)return key?.(event)
    event.stopPropagation?.()
    if(event.key==='Escape'){event.preventDefault();runtime.closeOriginalDownloads({restoreFocus:true});return}
    if(event.key==='Tab'){runtime.closeOriginalDownloads({restoreFocus:true});return}
    const links=[...popup.element.querySelectorAll('[data-original-download-link]')],index=links.indexOf(event.target)
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?links.length-1:(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length
      links[next]?.focus({preventScroll:true});return
    }
    if(event.key===' '&&index>=0){event.preventDefault();links[index].click()}
  }
  const outside=event=>{const popup=runtime.originalDownloadMenu,path=event.composedPath?.()||[];if(popup&&!path.includes(popup.element)&&!path.includes(popup.anchor)&&!popup.element.contains(event.target)&&!popup.anchor.contains(event.target))runtime.closeOriginalDownloads()}
  runtime.attachOriginalDownloads=()=>{root.addEventListener('click',click);doc.addEventListener('pointerdown',outside,true);view?.addEventListener('resize',runtime.positionOriginalDownloads);root.addEventListener('scroll',runtime.positionOriginalDownloads,true)}
  runtime.cleanupOriginalDownloads=()=>{runtime.closeOriginalDownloads();root.removeEventListener('click',click);doc.removeEventListener('pointerdown',outside,true);view?.removeEventListener('resize',runtime.positionOriginalDownloads);root.removeEventListener('scroll',runtime.positionOriginalDownloads,true)}
}
function originalReaderRenderData(runtime,data){
  const source=originalReaderPayload(data),pane=runtime.root.querySelector('[data-pane="original"]')
  // replaceStudyDeskMarkup retains this exact edition's mounted pane. Avoid
  // building and parsing a whole duplicate book only to throw it away there.
  return pane&&source?.id&&runtime.originalState?.id===source.id?{...data,retained_original_id:source.id}:data
}
function originalReaderPane(data){
  const source=originalReaderPayload(data);if(!source)return ''
  if(data.retained_original_id&&data.retained_original_id===source.id)return '<section data-pane="original"></section>'
  const locations=arr(source.locations),available=source.available!==false&&locations.length>0,noun=originalLocationNoun(source.kind)
  const icon=(path)=>`<svg viewBox="0 0 16 16" aria-hidden="true">${path}</svg>`
  return `<section class="desk-window original-pane" data-pane="original" data-layer="ORIGINAL" aria-label="Original ${esc((source.kind||'source').toUpperCase())}" hidden>
    <div class="window-titlebar"><div class="original-reader-heading"><strong>${esc(source.title||'Original edition')}</strong><small>Original / ${esc((source.kind||'source').toUpperCase())}</small></div>${originalFormatControl(data,{expanded:true})}${originalDownloadControl(data,{expanded:true})}<button class="original-reader-exit" type="button" data-original-expand aria-label="Return to panes" title="Return to panes · Escape">${icon('<path d="m6 3-5 5 5 5M1 8h13"/>')}<span>Return to panes</span></button></div>
    <div class="original-chrome">
    ${available?paneSlider(data.stack,'ORIGINAL',source.initial_location_id||locations[0]?.id):''}
    <div class="original-tools" role="toolbar" aria-label="Original reading controls">
      <button type="button" data-original-step="-1" aria-label="Previous source ${noun}" title="Previous ${noun}">${icon('<path d="m9.5 4-4 4 4 4"/>')}</button>
      <button type="button" data-original-step="1" aria-label="Next source ${noun}" title="Next ${noun}">${icon('<path d="m6.5 4 4 4-4 4"/>')}</button>
      <button type="button" data-original-follow aria-label="Follow reading" aria-pressed="true"${available?'':' disabled'} title="Keep the original and companion chapters together">${icon('<path d="m6 5 2-2a3 3 0 0 1 4 4l-2 2M10 11l-2 2a3 3 0 0 1-4-4l2-2M6 10l4-4"/>')}<span data-original-follow-label>Follow</span></button>
      <span class="original-status" data-original-status role="status">${esc(available?'Read together':source.message||'Original source unavailable')}</span>
      <div class="original-zoom" role="group" aria-label="Reader zoom"><button type="button" data-original-zoom-step="-1" aria-label="Zoom out original" title="Zoom out">−</button><button type="button" data-original-fit aria-label="Fit original to reading width" title="Reset to a comfortable reading width"><span data-original-zoom-label>Fit</span></button><button type="button" data-original-zoom-step="1" aria-label="Zoom in original" title="Zoom in">+</button></div>
      <button type="button" data-original-theme-toggle aria-label="Switch to light view" title="Light original pages"><svg data-original-theme-icon viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3"/></svg><span data-original-theme-label>Light</span></button>
      <button type="button" data-original-expand aria-label="Expand" aria-expanded="false"${available?'':' disabled'} title="Enter reading mode">${icon('<path d="M6 2H2v4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>')}<span data-original-expand-label>Expand</span></button>
    </div></div>
    <div class="window-body original-pages" data-original-pages data-reading-id="original:${esc(source.id)}" tabindex="0" aria-label="Original edition ${noun}s">${available?locations.map(location=>`<article class="original-page" data-original-page="${esc(location.id)}" data-kind="${esc(source.kind)}"${location.width&&location.height?` style="--original-ratio:${Number(location.width)/Number(location.height)}"`:''}><small class="original-page-label">${esc(location.label)}</small><div class="original-placeholder">${esc(location.label)} · ready to read</div></article>`).join(''):`<div class="original-placeholder">${esc(source.message||'No original text or preserved edition is available.')}</div>`}</div>
    <div class="original-reading-dock" role="group" aria-label="Reading mode">
      <button type="button" data-original-controls aria-label="Hide reader controls" aria-pressed="true" title="Show or hide reading controls"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12M5 2v4M11 6v4M7 10v4"/></svg><span data-original-controls-label>Hide controls</span></button>
      <button type="button" data-original-exit aria-label="Return to panes" title="Return to panes · Escape"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h4V2M14 10h-4v4M6 6 1 1M10 10l5 5"/></svg><span>Return</span></button>
    </div>
  </section>`
}
function originalSingleChapter(location){
  const ids=[...new Set(arr(location?.raw_unit_ids).filter(Boolean))]
  return ids.length>1?'':String(location?.raw_unit_id||ids[0]||'')
}
function originalVisibleText(page,body){
  const copy=page?.node?.querySelector('.original-edition-copy')
  if(!copy)return page?.text||''
  const bounds=body.getBoundingClientRect(),line=bounds.top+Math.min(100,bounds.height*.2)
  const blocks=page.blocks||(page.blocks=[...copy.querySelectorAll('p,li,blockquote,h1,h2,h3,td,figcaption')]),visible=[]
  for(const node of blocks){const rect=node.getBoundingClientRect();if(rect.top>=bounds.bottom)break;if(rect.bottom>line)visible.push(node);if(visible.length===3)break}
  return (visible.length?visible.slice(0,3).map(node=>typeof originalAnnotationText==='function'?originalAnnotationText(node):node.textContent).join(' '):(typeof originalAnnotationText==='function'?originalAnnotationText(copy):copy.textContent))||''
}
function originalReadingAnchor(body){
  if(!body||!body.clientHeight)return null
  const bounds=body.getBoundingClientRect(),scale=readerLayoutScale(body,bounds),offset=Math.min(80,body.clientHeight*.2),line=bounds.top+offset*scale
  const nodes=[...body.querySelectorAll('.original-edition-copy p,.original-edition-copy h1,.original-edition-copy h2,.original-edition-copy li,.original-page[data-kind="pdf"]')]
  const node=nodes.find(node=>{const rect=node.getBoundingClientRect();return rect.bottom>line&&rect.top<bounds.bottom})
  if(!node)return null
  const rect=node.getBoundingClientRect()
  return {node,fraction:Math.max(0,Math.min(1,(line-rect.top)/(rect.height||1))),offset}
}
function originalRestoreAnchor(body,anchor){
  if(!body||!anchor)return
  const bounds=body.getBoundingClientRect(),rect=anchor.node.getBoundingClientRect()
  body.scrollTop+=(rect.top+rect.height*anchor.fraction-bounds.top)/readerLayoutScale(body,bounds)-anchor.offset
}
function setupOriginalReader(runtime){
  const root=runtime.root,view=root.ownerDocument.defaultView
  runtime.originalStates=new Map()
  try{const saved=view?.localStorage?.getItem('care-original-theme/1');if(['light','dark'].includes(saved))runtime.originalTheme=saved}catch(_){}
  runtime.originalSave=()=>{
    const state=runtime.originalState;if(!state)return
    const saved={id:state.id,location:state.location,offset:state.offset||0,follow:state.follow,expanded:state.expanded,open:Boolean(state.open),zoom:state.zoom||1,controlsMode:state.controlsMode||'auto'}
    runtime.originalStates.set(state.id,saved)
    try{view?.localStorage?.setItem('care-original-reader/1:'+state.id,JSON.stringify(saved))}catch(_){}
  }
  runtime.revealOriginal=({follow=true}={})=>{
    const state=runtime.originalState,pane=root.querySelector('[data-pane="original"]'),strip=root.querySelector('[data-strip]')
    if(!state||!pane||!strip)return false
    if(pane.classList?.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click()
    state.open=true;state.entered=true;pane.hidden=false
    runtime.originalRestorePosition?.();runtime.originalLoad?.(state.location);runtime.originalWarm?.(state.location)
    strip.scrollLeft=0;runtime.focused='original';runtime.paintFocus();runtime.originalSave();if(follow)runtime.originalFollow();return true
  }
  const focus=runtime.focus
  runtime.focus=id=>{if(id==='original'){runtime.revealOriginal();return}return focus?.(id)}
  const wheel=runtime.onWheel
  runtime.onWheel=event=>{
    const pane=root.querySelector('[data-pane="original"]'),strip=root.querySelector('[data-strip]')
    if(pane?.hidden&&strip?.contains(event.target)&&!event.ctrlKey&&!event.metaKey&&!event.target?.closest?.('[data-slider-track]')&&(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))){
      const unit=event.deltaMode===1?16:event.deltaMode===2?strip.clientWidth:1,delta=(event.shiftKey&&Math.abs(event.deltaY)>Math.abs(event.deltaX)?event.deltaY:event.deltaX)*unit
      if(advanceDiscoveryGate(runtime.originalGate||(runtime.originalGate={}),{atEnd:strip.scrollLeft<=2,delta:-delta,now:Date.now()})){
        event.preventDefault();event.stopPropagation();runtime.revealOriginal();return
      }
    }
    return wheel?.(event)
  }
  runtime.originalPaint=()=>{
    const state=runtime.originalState,payload=originalReaderPayload(runtime.data);if(!state||!payload)return
    runtime.originalPaintControls?.()
    const location=arr(payload.locations).find(item=>item.id===state.location),index=arr(payload.locations).indexOf(location),chapter=originalSingleChapter(location)
    const follow=root.querySelector('[data-original-follow]'),expand=root.querySelector('[data-original-expand]'),select=root.querySelector('[data-original-location]'),status=root.querySelector('[data-original-status]')
    if(follow){follow.setAttribute('aria-pressed',String(state.follow));follow.setAttribute('aria-label',state.follow?'Follow reading':'Follow off');const label=root.querySelector('[data-original-follow-label]');if(label)label.textContent=state.follow?'Follow':'Follow off'}
    if(expand){expand.setAttribute('aria-expanded',String(state.expanded));expand.setAttribute('aria-label',state.expanded?'Return to panes':'Expand');const label=root.querySelector('[data-original-expand-label]');if(label)label.textContent=state.expanded?'Return':'Expand'}
    root.querySelectorAll('[data-original-expand]').forEach(button=>{button.setAttribute('aria-expanded',String(state.expanded));button.setAttribute('aria-label',state.expanded?'Return to panes':'Expand')})
    const documentBody=root.ownerDocument.body
    if(documentBody)documentBody.dataset.careOriginalReading=String(state.expanded)
    root.querySelectorAll('[data-pane]').forEach(pane=>{pane.inert=Boolean(state.expanded&&pane.dataset.pane!=='original')})
    const zoom=state.zoom||1,label=root.querySelector('[data-original-zoom-label]')
    if(label)label.textContent=zoom===1?'Fit':Math.round(zoom*100)+'%'
    root.querySelectorAll('[data-original-zoom-step]').forEach(button=>{button.disabled=Number(button.dataset.originalZoomStep)<0?zoom<=.6:zoom>=2})
    root.dataset.originalExpanded=String(state.expanded)
    const theme=runtime.originalTheme||(runtime.skin==='classic'?'light':'dark'),light=theme==='light'
    root.dataset.originalTheme=theme
    const themeButton=root.querySelector('[data-original-theme-toggle]'),themeLabel=root.querySelector('[data-original-theme-label]'),themeIcon=root.querySelector('[data-original-theme-icon]')
    if(themeButton){themeButton.setAttribute('aria-label',light?'Switch to dark view':'Switch to light view');themeButton.setAttribute('title',light?'Dark original pages':'Light original pages')}
    if(themeLabel)themeLabel.textContent=light?'Dark':'Light'
    if(themeIcon)themeIcon.innerHTML=light?'<path d="M13.4 9.2A5.7 5.7 0 0 1 6.8 2.6 5.7 5.7 0 1 0 13.4 9.2Z"/>':'<circle cx="8" cy="8" r="3"/><path d="M8 1v1M8 14v1M1 8h1M14 8h1M3 3l.7.7M12.3 12.3l.7.7M3 13l.7-.7M12.3 3.7l.7-.7"/>'
    if(select)select.value=state.location
    const slider=root.querySelector('[data-sheet-slider="ORIGINAL"]');if(slider&&index>=0)runtime.paintSlider(slider,index)
    root.querySelectorAll('[data-original-step]').forEach(button=>{button.disabled=Number(button.dataset.originalStep)<0?index<=0:index<0||index>=payload.locations.length-1})
    if(status)status.textContent=payload.available===false?payload.message||'Original source unavailable':!state.follow?'Reading independently':chapter?(state.pending?'Following chapter…':'Chapters linked'):'Unlinked '+originalLocationNoun(payload.kind)
  }
  runtime.originalFollow=()=>{
    const state=runtime.originalState,payload=originalReaderPayload(runtime.data)
    if(!state||!payload||!state.follow||state.driver==='desk'||runtime.readerView==='outline')return
    const location=arr(payload.locations).find(item=>item.id===state.location),chapter=originalSingleChapter(location)
    if(!chapter){originalPaintAwareness(runtime,[]);return}
    if(chapter!==String(runtime.data?.stack?.active_raw_unit_id||'')){
      originalPaintAwareness(runtime,[])
      if(state.pending!==chapter){state.pending=chapter;runtime.api?.setTriggerValue('open_chapter',chapter)}
    }else{
      state.pending=''
      const page=state.pages?.get(state.location),text=originalVisibleText(page,state.body)
      const evidenceKey=chapter+'|'+text
      if(state.evidenceKey===evidenceKey)return
      state.evidenceKey=evidenceKey
      const matches=originalAwarenessMatches(runtime.data.stack,text)
      originalPaintAwareness(runtime,matches.passage_ids)
    }
    runtime.originalPaint()
  }
  runtime.originalGo=(id,{fromDesk=false}={})=>{
    const state=runtime.originalState,node=state?.pages?.get(id)?.node,body=root.querySelector('[data-original-pages]')
    if(!state||!node||!body)return
    state.driver=fromDesk?'desk':'original';state.location=id;state.offset=runtime.originalReadingInset?.()||16;state.restoreRequested=true;state.evidenceKey=''
    const bounds=body.getBoundingClientRect(),scale=readerLayoutScale(body,bounds)
    body.scrollTop+=(node.getBoundingClientRect().top-bounds.top)/scale-state.offset
    runtime.originalRestorePosition?.();state.programmaticTop=body.scrollTop
    runtime.originalLoad?.(id);runtime.originalWarm?.(id);runtime.originalPaint();runtime.originalSave();if(!fromDesk)runtime.originalFollow()
  }
  // An explicit choice in any companion pane takes the lead immediately,
  // including while an earlier source-driven chapter request is in flight.
  runtime.originalDeskChapter=chapter=>{
    const state=runtime.originalState,payload=originalReaderPayload(runtime.data)
    if(!state||!payload||!state.follow)return
    state.driver='desk';state.pending='';state.evidenceKey='';originalPaintAwareness(runtime,[])
    const location=arr(payload.locations).find(item=>originalSingleChapter(item)===String(chapter||''))
    if(location&&originalSingleChapter(arr(payload.locations).find(item=>item.id===state.location))!==String(chapter))runtime.originalGo(location.id,{fromDesk:true})
  }
  runtime.onOriginalClick=event=>{
    if(runtime.onOriginalAnnotationClick?.(event))return true
    const link=event.target?.closest?.('.original-edition-copy a')
    if(link&&String(link.getAttribute('href')||'').startsWith('#')){
      event.preventDefault?.()
      const state=runtime.originalState,id=link.dataset.originalLocation||link.closest('[data-original-page]')?.dataset.originalPage
      if(!state||!id)return true
      try{state.fragment=decodeURIComponent(link.getAttribute('href').slice(1))}catch(_){state.fragment=''}
      runtime.originalGo(id);runtime.originalFragment?.();return true
    }
    const button=event.target?.closest?.('button[data-original-follow],button[data-original-expand],button[data-original-step],button[data-original-retry],button[data-original-theme-toggle],button[data-original-zoom-step],button[data-original-fit],button[data-original-controls],button[data-original-exit]')
    if(!button)return false
    const state=runtime.originalState,payload=originalReaderPayload(runtime.data);if(!state||!payload)return true
    if(button.hasAttribute('data-original-controls')){
      // Toggle the explicit choice; pointer/focus wake events must not turn
      // a click on the quiet dock into a second, conflicting visibility change.
      state.controlsMode=state.controlsMode==='shown'?'hidden':state.controlsMode==='hidden'?'shown':root.dataset.originalQuiet==='true'?'shown':'hidden'
      runtime.originalWake?.();runtime.originalSave();return true
    }
    runtime.originalWake?.()
    if(button.hasAttribute('data-original-zoom-step')||button.hasAttribute('data-original-fit')){
      runtime.originalZoom?.(button.hasAttribute('data-original-fit')?1:Math.round(((state.zoom||1)+Number(button.dataset.originalZoomStep)*.2)*10)/10)
    }else if(button.hasAttribute('data-original-theme-toggle')){
      runtime.originalTheme=root.dataset.originalTheme==='light'?'dark':'light'
      try{view?.localStorage?.setItem('care-original-theme/1',runtime.originalTheme)}catch(_){}
    }else if(button.hasAttribute('data-original-follow')){
      state.follow=!state.follow;state.pending='';state.evidenceKey='';originalPaintAwareness(runtime,[])
      if(state.follow){state.driver='original';runtime.originalWarm?.(state.location);runtime.originalFollow()}
    }else if(button.hasAttribute('data-original-expand')||button.hasAttribute('data-original-exit')){
      runtime.closeOriginalFormats?.();runtime.closeOriginalDownloads?.()
      const strip=root.querySelector('[data-strip]'),anchor=originalReadingAnchor(state.body)
      if(!state.expanded)state.beforeExpand={left:strip?.scrollLeft||0,focused:runtime.focused}
      state.expanded=!state.expanded;runtime.originalPaint();runtime.originalApplyZoom?.()
      originalRestoreAnchor(state.body,anchor)
      if(strip){if(state.expanded){strip.scrollLeft=0;runtime.focused='original'}else{strip.scrollLeft=state.beforeExpand?.left||0;runtime.focused=state.beforeExpand?.focused||'original'}}
      runtime.paintFocus();(root.querySelector(state.expanded?(state.controlsMode==='hidden'?'[data-original-controls]':'.original-reader-exit'):'.original-tools [data-original-expand]')||root.querySelector('[data-original-expand]'))?.focus({preventScroll:true})
    }else if(button.hasAttribute('data-original-retry')){
      const id=button.dataset.originalRetry,page=state.pages.get(id);if(page)page.loaded=false
      runtime.originalLoad?.(id)
    }else{
      const locations=arr(payload.locations),index=locations.findIndex(item=>item.id===state.location),next=locations[index+Number(button.dataset.originalStep)]
      if(next)runtime.originalGo(next.id)
    }
    runtime.originalPaint();runtime.originalSave();return true
  }
  runtime.mountOriginalReader=({sameWork=false,resumed=false,formatSwitch=false,presentation=null}={})=>{
    const payload=originalReaderPayload(runtime.data),pane=root.querySelector('[data-pane="original"]'),body=pane?.querySelector('[data-original-pages]')
    if(!payload||!pane||!body){delete root.dataset.originalExpanded;if(root.ownerDocument.body)delete root.ownerDocument.body.dataset.careOriginalReading;return ()=>{}}
    let state=runtime.originalState
    if(!state||state.id!==payload.id){
      let saved=runtime.originalStates.get(payload.id)
      if(!saved){try{saved=JSON.parse(view?.localStorage?.getItem('care-original-reader/1:'+payload.id)||'null')}catch(_){}}
      state={id:payload.id,location:saved?.location||payload.initial_location_id||payload.locations?.[0]?.id||'',offset:Number(saved?.offset)||0,follow:saved?.follow!==false,expanded:Boolean(saved?.expanded),open:Boolean(saved?.open||saved?.expanded),pending:'',driver:'desk',controlsMode:['shown','hidden'].includes(saved?.controlsMode)?saved.controlsMode:'auto',zoom:Math.max(.6,Math.min(2,Number(saved?.zoom)||1)),pages:new Map()}
      runtime.originalState=state
    }
    if(!arr(payload.locations).some(item=>item.id===state.location))state.location=payload.initial_location_id||payload.locations?.[0]?.id||''
    if(presentation)Object.assign(state,presentation)
    const mounted=state.body===body
    pane.hidden=!state.open
    if(!mounted){state.body=body;state.restoreRequested=true;state.pages=new Map([...body.querySelectorAll('[data-original-page]')].map(node=>[node.dataset.originalPage,{node,loaded:false}]))}
    let active=true,frame=null,saveTimer=null,warmTimer=null,observer=null,quietTimer=null
    state.mounted=true
    runtime.originalReadingInset=()=>{
      if(!state.expanded||root.dataset.originalQuiet==='true')return 16
      const chrome=root.querySelector('.original-chrome'),bounds=body.getBoundingClientRect()
      return chrome?Math.max(16,(chrome.getBoundingClientRect().bottom-bounds.top)/readerLayoutScale(body,bounds)+16):16
    }
    runtime.originalApplyZoom=()=>{
      const zoom=state.zoom||1
      if(!pane.style)return
      if(zoom===1)pane.style.removeProperty('--original-page-width')
      else {
        const style=view.getComputedStyle?.(body),rem=parseFloat(view.getComputedStyle?.(root.ownerDocument.documentElement)?.fontSize)||16
        const gutter=style?(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0):(state.expanded?96:48)
        const available=Math.max(1,(body.clientWidth||640)-gutter)
        pane.style.setProperty('--original-page-width',Math.round(Math.min(available,(state.expanded?48:54)*rem)*zoom)+'px')
      }
      pane.style.setProperty('--original-text-scale',String(zoom))
    }
    runtime.originalZoom=value=>{
      const anchor=originalReadingAnchor(body)
      state.zoom=Math.max(.6,Math.min(2,value));runtime.originalApplyZoom();originalRestoreAnchor(body,anchor)
      runtime.originalPaint();runtime.originalSave();runtime.originalRefreshAnnotations?.()
    }
    runtime.originalPaintControls=()=>{
      root.dataset.originalControlsMode=state.controlsMode||'auto'
      const hidden=state.expanded&&state.controlsMode==='hidden'
      for(const selector of ['.original-chrome','.original-pane > .window-titlebar']){const node=root.querySelector(selector);if(node){node.inert=hidden;node.hidden=hidden}}
      const shown=root.dataset.originalQuiet!=='true',toggle=root.querySelector('[data-original-controls]'),label=root.querySelector('[data-original-controls-label]')
      if(toggle){toggle.setAttribute('aria-pressed',String(shown));toggle.setAttribute('aria-label',shown?'Hide reader controls':'Show reader controls')}
      if(label)label.textContent=shown?'Hide controls':'Controls'
    }
    const quiet=()=>{
      if(!active||state.controlsMode==='shown'||runtime.originalFormatMenu||runtime.originalDownloadMenu)return
      // Keyboard users keep controls visible while working in the toolbar.
      const focused=pane.querySelector?.(':focus-visible')
      if(focused?.closest?.('.original-chrome,.window-titlebar'))return
      root.dataset.originalQuiet='true';runtime.originalPaintControls()
    }
    runtime.originalWake=()=>{
      root.dataset.originalQuiet=state.controlsMode==='hidden'?'true':'false';runtime.originalPaintControls()
      if(quietTimer)view.clearTimeout(quietTimer)
      if(!['shown','hidden'].includes(state.controlsMode))quietTimer=view.setTimeout(quiet,2400)
    }
    const wake=event=>{
      if(event.target?.closest?.('.original-reading-dock'))return
      if(event.type==='pointermove'&&event.target?.closest?.('[data-original-pages]')){
        const top=pane.getBoundingClientRect?.().top||0
        if(!state.expanded||!Number.isFinite(event.clientY)||event.clientY>top+110)return
      }
      runtime.originalWake()
    }
    const resizeOriginal=()=>{const anchor=originalReadingAnchor(body);runtime.originalApplyZoom();originalRestoreAnchor(body,anchor);runtime.originalRefreshAnnotations?.()}

    const locations=new Map(arr(payload.locations).map(location=>[location.id,location]))
    const currentPage=(id,page)=>runtime.originalState===state&&state.pages.get(id)===page
    const displaySection=(id,page)=>{
      if(!page.content||page.ready||!currentPage(id,page))return
      const anchor=state.location!==id&&!pane.hidden?originalReadingAnchor(body):null
      const copy=root.ownerDocument.createElement('div');copy.className='original-edition-copy';copy.innerHTML=page.content.html||''
      // HTML comes from the server sanitizer; prefetch never changes page geometry.
      page.text=page.content.text||copy.textContent;page.node.querySelector('.original-placeholder')?.remove();page.node.append(copy);page.ready=true;delete page.content;runtime.originalAnnotatePage?.(id)
      if(state.mounted){
        if(state.location===id){if(state.restoreRequested)runtime.originalRestorePosition();runtime.originalFragment();runtime.originalFollow()}
        else if(anchor){originalRestoreAnchor(body,anchor);state.programmaticTop=body.scrollTop}
      }
    }
    runtime.originalFragment=()=>{
      if(!state.fragment)return
      const node=state.pages.get(state.location)?.node?.querySelector('#'+CSS.escape(state.fragment))
      if(node){const bounds=body.getBoundingClientRect();body.scrollTop+=(node.getBoundingClientRect().top-bounds.top)/readerLayoutScale(body,bounds)-24;state.programmaticTop=body.scrollTop;state.fragment=''}
    }
    const safeURL=value=>{try{const url=new URL(value,view.location.href);return url.origin===view.location.origin?url.href:''}catch(_){return ''}}
    runtime.originalLoad=async (id,{prefetch=false}={})=>{
      const page=state.pages.get(id),location=locations.get(id);if(!page||!location)return
      if(!prefetch)page.show=true
      if(page.content&&page.show)displaySection(id,page)
      if(page.loaded)return
      page.loaded=true
      const placeholder=page.node.querySelector('.original-placeholder')
      if(placeholder&&!prefetch)placeholder.textContent='Loading '+(location.label||originalLocationNoun(payload.kind))+'…'
      try{
        if(payload.kind==='pdf'){
          const url=safeURL(location.image_url);if(!url)throw Error('Page is unavailable')
          const img=root.ownerDocument.createElement('img');img.className='original-pdf-page';img.alt=location.label||'Original PDF page';img.decoding='async';img.fetchPriority=id===state.location?'high':'low'
          img.onload=()=>{if(currentPage(id,page)){page.ready=true;placeholder?.remove();if(img.naturalWidth&&img.naturalHeight)page.node.style.setProperty('--original-ratio',String(img.naturalWidth/img.naturalHeight));if(state.mounted&&state.location===id&&state.restoreRequested)runtime.originalRestorePosition()}}
          img.onerror=()=>{img.remove();if(currentPage(id,page))fail()};img.src=url;page.node.append(img)
        }else{
          const url=safeURL(location.content_url);if(!url)throw Error('Section is unavailable')
          const response=await view.fetch(url);if(!response.ok)throw Error('Section is unavailable')
          const content=await response.json();if(!currentPage(id,page))return
          page.content=content;page.text=content.text||'';if(page.show)displaySection(id,page)
        }
      }catch(error){if(currentPage(id,page))fail()}
      function fail(){page.loaded=false;if(placeholder){placeholder.innerHTML=`This ${originalLocationNoun(payload.kind)} could not load. <button type="button" data-original-retry="${esc(id)}">Try again</button>`}}
    }
    const loadPageText=async id=>{
      const page=state.pages.get(id),location=locations.get(id)
      if(payload.kind!=='pdf'||!page||page.text!==undefined||page.textLoading||!location?.content_url)return
      const url=safeURL(location.content_url);if(!url)return
      page.textLoading=true
      try{const response=await view.fetch(url);if(!response.ok)return;const content=await response.json();if(currentPage(id,page)){page.text=content.text||'';runtime.originalAnnotatePage?.(id);if(state.mounted&&state.location===id)runtime.originalFollow()}}catch(_){}finally{page.textLoading=false}
    }
    runtime.originalLoadText=loadPageText
    runtime.originalWarm=id=>{
      loadPageText(id)
      if(warmTimer)view.clearTimeout(warmTimer)
      warmTimer=view.setTimeout(()=>{
        if(!active)return
        const rows=arr(payload.locations),index=rows.findIndex(row=>row.id===id)
        for(const delta of payload.kind==='pdf'?[1,-1,2]:[1,-1]){
          const next=rows[index+delta];if(!next)continue
          runtime.originalLoad(next.id,{prefetch:true});loadPageText(next.id)
        }
      },60)
    }
    const locate=()=>{
      frame=null
      if(!active||!body.clientHeight||pane.hidden||state.restoreRequested||root.dataset.view==='outline')return
      if(state.programmaticTop!==undefined&&Math.abs(body.scrollTop-state.programmaticTop)<2)return
      state.programmaticTop=undefined
      const bounds=body.getBoundingClientRect(),scale=readerLayoutScale(body,bounds),line=bounds.top+Math.min(100,body.clientHeight*.2)*scale
      // Page tops are ordered, so find the reading page without measuring the whole book.
      const rows=arr(payload.locations);let low=0,high=rows.length-1,index=0
      while(low<=high){const middle=(low+high)>>1,node=state.pages.get(rows[middle].id)?.node;if(!node)break;if(node.getBoundingClientRect().top<=line){index=middle;low=middle+1}else high=middle-1}
      const closest=rows[index]?.id;if(!closest)return
      const changed=state.location!==closest
      state.driver='original';state.location=closest
      state.offset=(state.pages.get(closest).node.getBoundingClientRect().top-bounds.top)/scale
      runtime.originalLoad(closest);if(changed){runtime.originalPaint();runtime.originalWarm(closest)}
      if(saveTimer)view.clearTimeout(saveTimer);saveTimer=view.setTimeout(runtime.originalSave,250)
      loadPageText(closest);if(state.follow)runtime.originalFollow()
    }
    const scroll=()=>{runtime.originalDismissPreview?.();if(state.controlsMode!=='shown'&&!pane.querySelector?.(':focus-visible')){root.dataset.originalQuiet='true';runtime.originalPaintControls()};if(frame===null)frame=view.requestAnimationFrame?view.requestAnimationFrame(locate):view.setTimeout(locate,16)}
    const resumeReading=event=>{if(!event.target?.closest?.('.original-annotation-rail'))runtime.originalDismissPreview?.()}
    const annotationBoundary=event=>runtime.onOriginalAnnotationBoundary?.(event)
    const strip=root.querySelector('[data-strip]')
    const stripScroll=()=>{
      if(!state.open||state.expanded||!strip)return
      const passage=root.querySelector('[data-pane="source"]');if(!passage)return
      const bounds=strip.getBoundingClientRect(),padding=parseFloat(view?.getComputedStyle?.(strip)?.paddingLeft)||0
      const boundary=strip.scrollLeft+(passage.getBoundingClientRect().left-bounds.left)/readerLayoutScale(strip,bounds)-padding
      if(strip.scrollLeft<boundary-32)state.entered=true
      if(state.entered&&strip.scrollLeft>=boundary-2){
        const left=strip.scrollLeft;state.open=false;state.entered=false;state.expanded=false;pane.hidden=true;runtime.originalGate={}
        strip.scrollLeft=Math.max(0,left-boundary);runtime.originalSave()
      }
    }
    const change=event=>{if(event.target.matches?.('[data-original-location]'))runtime.originalGo(event.target.value)}
    const key=event=>{
      if(event.defaultPrevented)return
      if(!event.target?.closest?.('.original-reading-dock'))runtime.originalWake()
      if(event.key==='Escape'&&runtime.originalCloseNotes?.()){event.preventDefault();event.stopPropagation();return}
      if(event.key==='Escape'&&state.expanded){event.preventDefault();event.stopPropagation();runtime.onOriginalClick({target:root.querySelector('[data-original-expand]')});return}
      if(event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,select,textarea,button,a,[contenteditable="true"]'))return
      const direction={ArrowLeft:-1,ArrowRight:1}[event.key]
      if(direction){event.preventDefault();event.stopPropagation();const rows=arr(payload.locations),index=rows.findIndex(row=>row.id===state.location),next=rows[index+direction];if(next)runtime.originalGo(next.id)}
    }
    body.addEventListener('scroll',scroll,{passive:true});pane.addEventListener('change',change);pane.addEventListener('keydown',key)
    body.addEventListener('pointerdown',resumeReading,{passive:true})
    for(const event of ['pointerout','pointerover','focusout'])body.addEventListener(event,annotationBoundary,{passive:true})
    for(const event of ['pointermove','pointerdown','focusin','focusout'])pane.addEventListener(event,wake,{passive:true})
    view.addEventListener?.('resize',resizeOriginal)
    const escape=event=>{if(event.key==='Escape'&&state.expanded&&!event.defaultPrevented){event.preventDefault();runtime.onOriginalClick({target:root.querySelector('[data-original-expand]')})}}
    root.ownerDocument.addEventListener?.('keydown',escape)
    strip?.addEventListener?.('scroll',stripScroll,{passive:true})
    runtime.originalRestorePosition=()=>{
      const page=state.pages.get(state.location),node=page?.node
      if(!node||pane.hidden)return
      const ready=payload.kind==='pdf'||Boolean(node.querySelector('.original-edition-copy')),bounds=body.getBoundingClientRect()
      body.scrollTop+=(node.getBoundingClientRect().top-bounds.top)/readerLayoutScale(body,bounds)-(ready?state.offset:16)
      state.restoreRequested=!ready;state.programmaticTop=body.scrollTop
    }
    const chapter=String(runtime.data?.stack?.active_raw_unit_id||'')
    // Restoring a format changes only Original; following resumes on the next
    // deliberate page/chapter move or reading scroll.
    if(formatSwitch){state.activeChapter=chapter;state.driver='desk'}
    const chapterChanged=state.activeChapter!==chapter
    const acknowledgement=state.driver==='original'&&state.pending===chapter
    if(chapterChanged){
      state.evidenceKey=''
      if(state.follow&&!acknowledgement&&originalSingleChapter(locations.get(state.location))!==chapter)runtime.originalDeskChapter(chapter)
      state.activeChapter=chapter
    }
    if(acknowledgement)state.pending=''
    runtime.originalPaint();runtime.originalApplyZoom();runtime.originalWake();runtime.originalRefreshAnnotations?.()
    if(!mounted||state.restoreRequested)runtime.originalRestorePosition()
    // Warm the current position while Original is tucked away, keeping its gate closed.
    runtime.originalLoad(state.location,{prefetch:!state.open});runtime.originalWarm(state.location)
    if(view.IntersectionObserver){observer=new view.IntersectionObserver(entries=>{if(pane.hidden)return;entries.forEach(entry=>{if(entry.isIntersecting)runtime.originalLoad(entry.target.dataset.originalPage)})},{root:body,rootMargin:'900px 0px'});state.pages.forEach(page=>observer.observe(page.node))}
    if(acknowledgement&&state.open)runtime.originalFollow()
    else if(state.follow&&state.open&&state.driver!=='desk'){
      const matches=originalAwarenessMatches(runtime.data.stack,originalVisibleText(state.pages.get(state.location),body))
      originalPaintAwareness(runtime,matches.passage_ids,{scroll:false})
    }
    return ()=>{
      runtime.originalSave();active=false;state.mounted=false;observer?.disconnect();if(root.ownerDocument.body)delete root.ownerDocument.body.dataset.careOriginalReading
      root.querySelectorAll('[data-pane]').forEach(pane=>{pane.inert=false})
      if(quietTimer)view.clearTimeout(quietTimer)
      runtime.originalCloseNotes?.()
      view.removeEventListener?.('resize',resizeOriginal)
      root.ownerDocument.removeEventListener?.('keydown',escape)
      for(const event of ['pointermove','pointerdown','focusin','focusout'])pane.removeEventListener(event,wake)
      if(frame!==null){if(view.cancelAnimationFrame)view.cancelAnimationFrame(frame);else view.clearTimeout(frame)}
      if(saveTimer)view.clearTimeout(saveTimer);if(warmTimer)view.clearTimeout(warmTimer)
      // Same-book rerenders retain the actual pane and its in-flight loads.
      // Completion checks the edition/page identity before updating anything.
      body.removeEventListener('scroll',scroll);pane.removeEventListener('change',change);pane.removeEventListener('keydown',key)
      body.removeEventListener('pointerdown',resumeReading)
      for(const event of ['pointerout','pointerover','focusout'])body.removeEventListener(event,annotationBoundary)
      strip?.removeEventListener?.('scroll',stripScroll)
    }
  }
}


const BEAUTIFUL_TEXT_KEY='care-beautiful-text-v1'
const BEAUTIFUL_TEXT_EVENT='care-beautiful-text-change'
const beautifulTextSessions=new WeakMap()

function beautifulTextControl(){
  return '<button type="button" class="beautiful-text-toggle" data-beautiful-text-toggle aria-pressed="true" title="Clear reading typography; turn off to show original page details"><span class="beautiful-text-label">Beautiful text</span><span class="beautiful-text-switch" aria-hidden="true"></span></button>'
}

function beautifulTextPreference(value,fallback=true){
  if(value==='false')return false
  if(value==='true')return true
  return value===null||value===undefined?(typeof fallback==='boolean'?fallback:true):true
}

function beautifulTextOpeningLabel(value,semanticHeading=false){
  const text=String(value??'').trim()
  if(!text||text.length>140||/[\r\n]/.test(text))return ''
  if(/^(?:\d{1,4}|[IVXLCDM]{1,12})[.)]?$/i.test(text))return 'number'
  if(semanticHeading)return 'heading'
  const label=text.replace(/\.$/,'')
  const ordinal='(?:[ivxlcdm]+|\\d{1,4}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)'
  if(new RegExp('^(?:part|book|chapter|section|canto|lecture)\\s+'+ordinal+'(?:\\s*[:.–—-]\\s*[^.!?;]{1,90})?$','i').test(label))return 'heading'
  if(label.split(/\s+/).length<=12&&/^(?:[\p{L}\p{N}'’ -]{1,90}\s+)?(?:prologue|epilogue|preface|introduction|foreword|afterword)$/iu.test(label))return 'heading'
  return ''
}

function beautifulTextHeadingKey(value){return String(value??'').normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase()}

function beautifulTextOpeningTitles(source){
  const encoded=source.dataset.beautifulOpeningTitles??source.querySelector(':scope>.source-head')?.dataset.beautifulOpeningTitles
  try{const titles=JSON.parse(encoded||'[]');return new Set(Array.isArray(titles)?titles.filter(value=>typeof value==='string'&&value.trim()&&value.length<=140).map(beautifulTextHeadingKey):[])}catch(_){return new Set()}
}

function beautifulTextOpeningKind(container,verifiedTitles=null){
  if(!container||container.querySelector('a,pre,code,kbd,samp,math,svg,table,ul,ol,li,blockquote,br,img,.care-reading-math,.katex,.MathJax,[data-verse],[data-poetry],.verse,.poem,.poetry'))return ''
  const blocks=container.querySelectorAll('p,h1,h2,h3,h4,h5,h6')
  if(blocks.length>1)return ''
  const heading=container.querySelector('h1,h2,h3,h4,h5,h6'),text=container.textContent.trim()
  if(verifiedTitles?.has(beautifulTextHeadingKey(text)))return beautifulTextOpeningLabel(text,true)
  return beautifulTextOpeningLabel(text,!!heading&&heading.textContent.trim()===text)
}

function beautifulSourceDetail(passage){
  if(!beautifulHeadingDetail(passage)||passage.route_available===false)return false
  const text=String(passage.text??passage.reading_text??'').trim()
  // Context-dependent folios and running heads are classified against the
  // canonical source upstream. Never infer them from a short translated line.
  if(['page-number','running-header','source-locator'].includes(passage.beautiful_source_detail))return !!text
  if(!text||/[\r\n]/.test(text))return false
  // A complete, explicitly labelled page marker is metadata even when its
  // importer wrapped it in a Markdown quote. Bare numbers remain ambiguous.
  if(/^(?:>\s*)?(?:page|p\.)\s+(?:\d{1,5}|[ivxlcdm]{1,12})\.?$/i.test(text))return true
  const isURL=value=>{try{const url=new URL(value);return /^https?:$/.test(url.protocol)&&!!url.hostname&&!/\s|[<>]/.test(value)}catch(_){return false}}
  if(isURL(text))return true
  const link=text.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s<>]+)\)$/)
  if(!link||!isURL(link[2]))return false
  const locator=/^(?:I|II|III|I-II|II-II)\s+q\.\s*\d+\s+(?:pr\.|a\.\s*\d+\s+(?:arg\.\s*\d+|s\.\s*c\.(?:\s*\d+)?|co\.|ad\s*(?:\d+|arg\.)))$/i
  return link[1]===link[2]||/^Source scan \d+(?:\s*·\s*printed page (?:\d+|[ivxlcdm]+))?$/i.test(link[1])||locator.test(link[1])
}

function beautifulHeadingDetail(passage){
  // Unknown trace coverage must never be treated as an empty trace list.
  if(!passage||passage.trace_count!==0||!Array.isArray(passage.axioms)||passage.axioms.length)return false
  const populated=value=>Array.isArray(value)?value.length>0:value&&typeof value==='object'?Object.keys(value).length>0:typeof value==='string'?value.trim().length>0:!!value
  for(const [key,value] of Object.entries(passage)){
    if(key==='trace_count'||key==='axioms'||key==='route_available')continue
    if(/trace|axiom|feed|route|reference/i.test(key)&&populated(value))return false
  }
  return true
}

function beautifulTextHasOCRWraps(value){
  const text=String(value||'').replace(/\r\n?/g,'\n'),lines=text.split('\n').map(line=>line.trim())
  if(text.length<180||(text.match(/\S+/g)||[]).length<35||lines.length<3||lines.some(line=>!line))return false
  // Verse, tabular rows, lists, headings, formulae and intentionally indented
  // material do not provide enough evidence for reflow.
  if(/(?:^|\n)[ \t]{3,}\S|\t|(?:^|\n)\s*(?:[#>*•]|[-–—]\s|`{3,}|~{3,})|[|=]|\$[^\n]+\$/.test(text))return false
  const numbered=lines.map((line,index)=>({line,index})).filter(({line})=>/^(?:\d+|[a-zA-Z])[.)]\s/.test(line))
  // A single leading 1) is a prose footnote, not evidence of a multi-item
  // list. Its marker stays in the text. Actual list DOM is protected below.
  if(numbered.length&&!(numbered.length===1&&numbered[0].index===0&&/^\d+\)\s/.test(numbered[0].line)))return false
  const lengths=lines.map(line=>line.length),average=lengths.reduce((a,b)=>a+b,0)/lines.length
  const continuation=lines.slice(1).filter(line=>/^[a-zà-öø-ÿ]/.test(line)).length
  if(average>=32&&lengths.filter(length=>length<18).length<=1&&continuation>=(lines.length-1)*.5)return true
  // Long OCR prose can contain a few tiny continuation fragments among full
  // lines. Require several sentences and predominantly long, continuing
  // lines before loosening the short-line limit; short verse stays untouched.
  const sentences=(text.match(/[.!?][’”"')\]]?(?=\s|$)/g)||[]).length
  return text.length>=300&&(text.match(/\S+/g)||[]).length>=50&&lines.length>=5&&average>=25&&sentences>=2&&lengths.filter(length=>length>=35).length>=lines.length*.5&&lengths.filter(length=>length<18).length<=Math.max(2,Math.floor(lines.length*.3))&&continuation>=(lines.length-1)*.65
}

function beautifulTextJoinWord(left,right){
  // Only unmistakable end fragments are joined. Ordinary compounds such as
  // well-being, self-conscious and mother-in-law keep their hyphens.
  if(left.length<3||/^(?:well|self|non|pre|post|anti|pro|neo|semi|multi|cross|half|all|ill|low|high|long|short|full|part|co|re|ex)$/i.test(left))return false
  return /^(?:tion|tions|sion|sions|ation|ations|isation|ization|ical|ically|cal|cally|cial|tial|ness|nesses|ment|ments|able|ably|ible|ibly|ity|ities|ous|ously|ative|ence|ences|ance|ances|ary|aries|ory|ories|ology|ological|ful|fully|less|lessly|ing|ings|ed|ly|al|ally|ive|ively)$/.test(right)
}

function beautifulTextNormalizeProse(value,knownOCR=false){
  let text=String(value??'').replace(/\u00ad/g,'')
  if(!knownOCR&&!beautifulTextHasOCRWraps(text))return text
  text=text.replace(/([A-Za-zÀ-ÖØ-öø-ÿ]{3,})-[ \t]*\r?\n[ \t]*([a-zà-öø-ÿ]+)/g,(all,left,right)=>beautifulTextJoinWord(left,right)?left+right:left+'-'+right)
  return text.replace(/([^\n])[ \t]*\r?\n[ \t]*(?=[^\n])/g,'$1 ')
}

const BEAUTIFUL_TEXT_PROTECTED='a,pre,code,kbd,samp,math,svg,script,style,textarea,table,ul,ol,li,blockquote,h1,h2,h3,h4,h5,h6,.care-reading-math,.katex,.MathJax,[data-verse],[data-poetry],.verse,.poem,.poetry,[contenteditable]'

function beautifulTextOmitVerifiedPrefix(container,prefix){
  // This is an evidence-backed hint from the source payload, never a guess
  // from the shape or length of a word. Only the first standalone fragment
  // may be omitted, and only while working on a disposable reading clone.
  if(typeof prefix!=='string'||!prefix||prefix!==prefix.trim()||/[\r\n]/.test(prefix))return false
  const meaningful=node=>node.nodeType!==3||!!node.nodeValue?.trim()
  let host=container,children=[...host.childNodes].filter(meaningful)
  while(children.length===1&&children[0].nodeType===1&&children[0].matches('.care-reading-text,.care-reading-inline')){
    host=children[0];children=[...host.childNodes].filter(meaningful)
  }
  const first=children[0]
  if(!first)return false
  const hasFollowing=children.slice(1).some(node=>!!node.textContent?.trim()||node.nodeType===1&&!!node.querySelector('img,svg,math'))
  if(first.nodeType===1&&first.tagName==='P'&&first.textContent===prefix&&!first.querySelector('*')&&hasFollowing){first.remove();return true}
  if(first.nodeType!==3)return false
  const value=first.nodeValue||'',start=value.startsWith(prefix+'\n\n')?prefix+'\n\n':value.startsWith(prefix+'\r\n\r\n')?prefix+'\r\n\r\n':''
  if(!start)return false
  const remainder=value.slice(start.length)
  if(!remainder.trim()&&!hasFollowing)return false
  first.nodeValue=remainder
  return true
}

function beautifulTextProseClone(container){
  const clone=container.cloneNode(true),document=container.ownerDocument
  const verifiedPrefix=container.dataset.beautifulOmitPrefix??container.closest('.passage')?.dataset.beautifulOmitPrefix
  beautifulTextOmitVerifiedPrefix(clone,verifiedPrefix)
  const paragraphs=[...clone.querySelectorAll('p')]
  // Legacy public readers may provide plain text and <br> without a <p>.
  if(!paragraphs.length&&!clone.querySelector('article,div,section,'+BEAUTIFUL_TEXT_PROTECTED))paragraphs.push(clone)
  for(const paragraph of paragraphs){
    if(paragraph.closest(BEAUTIFUL_TEXT_PROTECTED))continue
    const stream=[]
    const walk=node=>{
      if(node.nodeType===3){stream.push({node,text:node.nodeValue||'',kind:'text'});return}
      if(node.nodeType!==1)return
      if(node.matches(BEAUTIFUL_TEXT_PROTECTED)){stream.push({node,text:'\uFFFC',kind:'protected'});return}
      if(node.tagName==='BR'){stream.push({node,text:'\n',kind:'break'});return}
      for(const child of node.childNodes)walk(child)
    }
    for(const child of paragraph.childNodes)walk(child)
    // Markdown's <br>\n is one break, not an empty paragraph.
    stream.forEach((token,index)=>{if(token.kind==='text'&&index&&stream[index-1].kind==='break')token.text=token.text.replace(/^\r?\n/,'')})
    const raw=stream.map(token=>token.text).join(''),ocr=!stream.some(token=>token.kind==='protected')&&beautifulTextHasOCRWraps(raw)
    for(let index=0;index<stream.length;index++){
      const token=stream[index]
      if(token.kind==='text')token.node.nodeValue=beautifulTextNormalizeProse(token.text,ocr)
      else if(token.kind==='break'&&ocr){
        const before=stream[index-1],after=stream[index+1]
        let gap=' '
        if(before?.kind==='text'&&after?.kind==='text'){
          const left=before.node.nodeValue.match(/([A-Za-zÀ-ÖØ-öø-ÿ]{3,})-[ \t]*$/),right=after.text.match(/^[ \t]*([a-zà-öø-ÿ]+)/)
          if(left&&right){
            if(beautifulTextJoinWord(left[1],right[1]))before.node.nodeValue=before.node.nodeValue.replace(/-[ \t]*$/,'')
            gap=''
            after.text=after.text.replace(/^[ \t]+/,'')
          }
        }
        token.node.replaceWith(document.createTextNode(gap))
      }
    }
  }
  return clone
}

function beautifulTextReadingAnchors(root){
  const anchors=[],seen=new Set(),view=root.ownerDocument.defaultView
  for(const source of root.querySelectorAll('.source-copy')){
    let body=source.parentElement
    while(body&&body!==root.ownerDocument.documentElement){
      const overflow=view?.getComputedStyle?.(body)?.overflowY||''
      if(/auto|scroll/.test(overflow)&&body.scrollHeight>body.clientHeight)break
      body=body.parentElement
    }
    body=body&&body!==root.ownerDocument.documentElement?body:source.closest('.window-body')
    if(!body||seen.has(body))continue
    seen.add(body)
    const bounds=body.getBoundingClientRect(),passages=[...source.querySelectorAll('.passage')]
    const anchor=passages.find(node=>{const rect=node.getBoundingClientRect();return rect.bottom>bounds.top+2&&rect.top<bounds.bottom})
    if(anchor)anchors.push({body,anchor,offset:anchor.getBoundingClientRect().top-bounds.top,scale:body.offsetHeight?bounds.height/body.offsetHeight:1})
  }
  return()=>{for(const {body,anchor,offset,scale} of anchors){if(!root.contains(anchor))continue;const delta=anchor.getBoundingClientRect().top-body.getBoundingClientRect().top-offset;if(Math.abs(delta)>.5)body.scrollTop+=delta/(scale||1)}}
}

function setupBeautifulText(runtime){
  runtime.cleanupBeautifulText?.()
  const root=runtime.root,view=root?.ownerDocument?.defaultView
  if(!root||!view)return()=>{}
  const originals=new Map(),details=new Map(),openings=new Map(),prepared=new WeakSet()
  let disposed=false,observer=null,frame=null,updating=false
  const discardChangedProse=records=>{
    for(const record of records){
      if(record.type!=='childList'&&record.type!=='characterData')continue
      const target=record.target.nodeType===1?record.target:record.target.parentElement
      const container=target?.closest?.('.source-copy')&&target.closest('.passage-text')
      if(container){
        // Observed edits belong to the source owner, not our disconnected
        // formatter. Never restore older source over that newer content.
        originals.delete(container);prepared.delete(container)
      }
    }
  }
  const read=()=>{const fallback=beautifulTextSessions.get(view)??runtime.beautifulText??true;try{return beautifulTextPreference(view.localStorage?.getItem(BEAUTIFUL_TEXT_KEY),fallback)}catch(_){return fallback}}
  let enabled=read()
  const watch=()=>observer?.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-beautiful-compact','data-beautiful-opening-foldable','data-beautiful-opening-titles']})
  const mutate=callback=>{discardChangedProse(observer?.takeRecords?.()||[]);observer?.disconnect();updating=true;try{return callback()}finally{updating=false;if(!disposed)watch()}}
  const routeContext=()=>!!(runtime.data?.reference||runtime.data?.connection?.reference)
  const fold=(article,record)=>{
    record.text.hidden=true
    article.dataset.beautifulFolded='true'
  }
  const restoreDetail=(article,record)=>{
    record.text.hidden=record.wasHidden
    if(!record.hadHidden)record.text.removeAttribute('hidden')
    delete article.dataset.beautifulFolded
    record.row.classList.remove('beautiful-detail-row')
  }
  const paint=()=>{
    root.dataset.beautifulText=String(enabled)
    root.querySelectorAll('[data-beautiful-text-toggle]').forEach(button=>button.setAttribute('aria-pressed',String(enabled)))
  }
  const refresh=()=>mutate(()=>{
    for(const [node,previous] of openings){if(root.contains(node)){if(previous===null)node.removeAttribute('data-beautiful-opening');else node.setAttribute('data-beautiful-opening',previous)}}
    openings.clear()
    for(const [container,nodes] of originals){if(!root.contains(container)){originals.delete(container);continue}if(!enabled){container.replaceChildren(...nodes);originals.delete(container);prepared.delete(container)}}
    for(const [article,record] of details){if(!root.contains(article)){details.delete(article);continue}if(!enabled||routeContext()||(record.kind==='heading'?article.dataset.beautifulOpeningFoldable!=='true':article.dataset.beautifulCompact!=='true')){restoreDetail(article,record);details.delete(article)}}
    paint()
    if(!enabled){runtime.paintSelection?.();return}
    for(const container of root.querySelectorAll('.source-copy .passage>.passage-text')){
      if(container.closest('.route-pane,.route-source-card,.inspector-pane,.inspect-card')||originals.has(container)||prepared.has(container))continue
      const clone=beautifulTextProseClone(container)
      prepared.add(container)
      if(clone.innerHTML!==container.innerHTML){originals.set(container,[...container.childNodes]);container.replaceChildren(...clone.childNodes)}
    }
    const headingDuplicates=new Set()
    for(const source of root.querySelectorAll('.source-copy')){
      if(source.closest('.route-pane,.inspector-pane,.inspect-card'))continue
      const leading=[...source.querySelectorAll(':scope>.passage-row>.passage,:scope>.passage')],titles=beautifulTextOpeningTitles(source)
      let count=0
      for(const article of leading.slice(0,8)){
        if(article.dataset.beautifulCompact==='true')continue
        const text=article.querySelector(':scope>.passage-text'),kind=beautifulTextOpeningKind(text,titles)
        if(!kind)break
        openings.set(article,article.getAttribute('data-beautiful-opening'));article.dataset.beautifulOpening=kind;count++
        if(article.dataset.beautifulOpeningFoldable==='true'&&titles.has(beautifulTextHeadingKey(text.textContent)))headingDuplicates.add(article)
      }
      if(count){openings.set(source,source.getAttribute('data-beautiful-opening'));source.dataset.beautifulOpening='true'}
    }
    for(const [article,record] of details)if(record.kind==='heading'&&!headingDuplicates.has(article)){restoreDetail(article,record);details.delete(article)}
    const candidates=[...[...root.querySelectorAll('.source-copy .passage[data-beautiful-compact="true"]')].map(article=>({article,kind:'source'})),...[...headingDuplicates].map(article=>({article,kind:'heading'}))]
    for(const {article,kind} of candidates){
      if(routeContext()||article.closest('.route-pane,.route-source-card,.inspector-pane,.inspect-card'))continue
      let record=details.get(article)
      if(!record){
        const text=article.querySelector(':scope>.passage-text'),row=article.parentElement
        if(!text||!row?.classList.contains('passage-row'))continue
        record={text,row,kind,wasHidden:text.hidden,hadHidden:text.hasAttribute('hidden')}
        row.classList.add('beautiful-detail-row');details.set(article,record)
      }
      fold(article,record)
    }
    runtime.paintSelection?.()
  })
  const apply=(value,persist=false)=>{
    const next=value===true,restore=beautifulTextReadingAnchors(root)
    enabled=next;runtime.beautifulText=next;beautifulTextSessions.set(view,next)
    refresh();restore();runtime.queueThreads?.();runtime.queueTrackZoom?.()
    if(persist){
      try{view.localStorage?.setItem(BEAUTIFUL_TEXT_KEY,String(next))}catch(_){}
      if(view.CustomEvent)view.dispatchEvent(new view.CustomEvent(BEAUTIFUL_TEXT_EVENT,{detail:{enabled:next}}))
    }
  }
  const click=event=>{
    const control=event.target?.closest?.('[data-beautiful-text-toggle]')
    if(!control||!root.contains(control))return
    event.preventDefault();event.stopImmediatePropagation()
    apply(!enabled,true)
  }
  const key=event=>{if(event.target?.closest?.('[data-beautiful-text-toggle]')&&[' ','Enter','ArrowUp','ArrowDown','Home','End'].includes(event.key))event.stopImmediatePropagation()}
  const change=event=>{if(typeof event.detail?.enabled==='boolean'&&event.detail.enabled!==enabled)apply(event.detail.enabled)}
  const storage=event=>{if(event.key===BEAUTIFUL_TEXT_KEY||event.key===null)apply(read())}
  const queueRefresh=()=>{
    if(disposed||updating||frame!==null)return
    frame=view.requestAnimationFrame(()=>{frame=null;if(!disposed){refresh();runtime.queueThreads?.()}})
  }
  if(view.MutationObserver)observer=new view.MutationObserver(records=>{
    discardChangedProse(records)
    // Route drawings also replace SVG children. Only source changes can affect
    // this presentation, otherwise redraw -> mutation -> redraw never settles.
    let relevant=false
    for(const record of records){
      const target=record.target.nodeType===1?record.target:record.target.parentElement
      if(record.type==='attributes'){
        // Selection paints class/aria on every passage. They cannot change
        // prose or fold eligibility and must not trigger a whole-book scan.
        if(record.attributeName==='data-beautiful-opening-titles'&&target?.matches?.('.source-copy,.source-copy>.source-head'))relevant=true
        if(['data-beautiful-compact','data-beautiful-opening-foldable'].includes(record.attributeName)&&target?.closest?.('.source-copy')){
          relevant=true
        }
        continue
      }
      if(target?.closest?.('.source-copy')){
        relevant=true
      }else if([...(record.addedNodes||[]),...(record.removedNodes||[])].some(node=>node.nodeType===1&&(node.matches('.source-copy,[data-beautiful-text-toggle]')||node.querySelector('.source-copy,[data-beautiful-text-toggle]'))))relevant=true
    }
    if(relevant)queueRefresh()
  })
  root.addEventListener('click',click,true);root.addEventListener('keydown',key,true)
  view.addEventListener(BEAUTIFUL_TEXT_EVENT,change);view.addEventListener('storage',storage)
  runtime.paintBeautifulText=refresh
  const cleanup=()=>{
    if(disposed)return
    discardChangedProse(observer?.takeRecords?.()||[])
    disposed=true;observer?.disconnect();if(frame!==null)view.cancelAnimationFrame(frame)
    root.removeEventListener('click',click,true);root.removeEventListener('keydown',key,true)
    view.removeEventListener(BEAUTIFUL_TEXT_EVENT,change);view.removeEventListener('storage',storage)
    for(const [container,nodes] of originals)if(root.contains(container))container.replaceChildren(...nodes)
    for(const [article,record] of details)if(root.contains(article))restoreDetail(article,record)
    for(const [node,previous] of openings)if(root.contains(node)){if(previous===null)node.removeAttribute('data-beautiful-opening');else node.setAttribute('data-beautiful-opening',previous)}
    root.removeAttribute('data-beautiful-text')
    root.querySelectorAll('[data-beautiful-text-toggle]').forEach(button=>button.setAttribute('aria-pressed','false'))
    if(runtime.cleanupBeautifulText===cleanup){runtime.cleanupBeautifulText=null;runtime.paintBeautifulText=null}
  }
  runtime.cleanupBeautifulText=cleanup
  refresh()
  return cleanup
}


const TITLE_VIEW_KEY='care-title-view-v1'
const TITLE_VIEW_EVENT='care-title-view-change'
const titleViewSessions=new WeakMap()

function readerPaneCode(unit,layer=''){
  const item=typeof unit==='string'?{id:unit}:unit||{}
  const source=String(layer||item.type||item.layer||'').toUpperCase()==='SOURCE'
  const candidates=[source?item.raw_unit_id:null,item.canonical_unit_id,item.care_unit_id,item.unit_id,item.id,item.raw_unit_id]
  for(const candidate of candidates){
    const code=String(candidate||'').split(':')[0]
    if(/^[A-Z][A-Z0-9]{0,15}_[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(code))return code
  }
  return ''
}

function readerPaneImprint(unit,layer=''){
  const code=readerPaneCode(unit,layer)
  if(!code)return ''
  return `<div class="reader-pane-imprint"><span class="reader-pane-code" data-reader-code title="${esc(code)}">${esc(code)}</span></div>`
}

function titleViewControl(){
  return '<button type="button" class="title-view-toggle" data-title-view-toggle aria-pressed="true" title="Emphasize titles; switch off to restore full headings"><span>Titles only</span><span class="title-view-switch" aria-hidden="true"></span></button>'
}

function titleViewPreference(value,fallback=true){
  if(value===null||value===undefined)return fallback
  return value!=='false'
}

function paneSimpleTitle(unit,stack={},layer=''){
  const item=unit||{},kind=String(layer||item.type||item.layer||item.unit_type||'').split(':')[0].toUpperCase()
  if(kind==='CL'||kind==='MC'){
    const level=typeof mcLevel==='function'?mcLevel(item):item.mc_level
    const key=item.reader_slot||(kind==='MC'?`MC:${level||'legacy'}`:kind)
    const options=typeof sliderOptions==='function'?sliderOptions(stack,key):Array.isArray(stack?.sheet_options?.[key])?stack.sheet_options[key]:Array.isArray(stack?.sheet_options?.[kind])?stack.sheet_options[kind].filter(row=>kind!=='MC'||!level||Number(row.mc_level)===Number(level)):[]
    const ids=new Set([item.reader_option_id,item.id,item.unit_id,item.care_unit_id].filter(Boolean).map(String))
    const index=options.findIndex(row=>[row.id,row.unit_id,row.care_unit_id].some(id=>id&&ids.has(String(id))))
    const selected=index>=0?options[index]:{}
    const explicit=[item.sequence_number,item.chapter_number,selected.sequence_number,selected.chapter_number].map(Number).find(number=>Number.isInteger(number)&&number>0)
    const number=explicit||(index>=0?index+1:1)
    return `${kind==='MC'?'Metacluster':'Cluster'} ${number}${kind==='MC'&&level?` · Layer ${level}`:''}`
  }
  const title=String(item.reading_title||item.identity?.title||item.heading_title||item.title||item.label||item.id||'')
  return title.replace(/\s*([·•])\s*(\d+)\s*$/u,'\u00a0$1\u00a0$2')
}

function titleViewReadingAnchors(root){
  const restoreSource=typeof beautifulTextReadingAnchors==='function'?beautifulTextReadingAnchors(root):()=>{}
  const anchors=[]
  for(const body of root.querySelectorAll('.care-pane .window-body,.field-pane .pane-body')){
    if(!body.scrollTop||!body.getBoundingClientRect)continue
    const bounds=body.getBoundingClientRect()
    const anchor=[...body.querySelectorAll('.axiom-button,.field-item')].find(node=>{const rect=node.getBoundingClientRect();return rect.bottom>bounds.top+2&&rect.top<bounds.bottom})
    if(anchor)anchors.push({body,anchor,offset:anchor.getBoundingClientRect().top-bounds.top,scale:body.offsetHeight?bounds.height/body.offsetHeight:1})
  }
  return()=>{
    restoreSource()
    for(const {body,anchor,offset,scale} of anchors){
      if(!root.contains(anchor))continue
      const delta=anchor.getBoundingClientRect().top-body.getBoundingClientRect().top-offset
      if(Math.abs(delta)>.5)body.scrollTop+=delta/(scale||1)
    }
  }
}

function setupTitleView(runtime){
  runtime.cleanupTitleView?.()
  const root=runtime.root,doc=root?.ownerDocument,view=doc?.defaultView
  if(!root||!view)return()=>{}
  const moved=new Map(),groups=new Set()
  let observer=null,frame=null,disposed=false,updating=false
  const read=()=>{const fallback=titleViewSessions.get(view)??runtime.titleView??true;try{return titleViewPreference(view.localStorage?.getItem(TITLE_VIEW_KEY),fallback)}catch(_){return fallback}}
  let enabled=read()
  const watch=()=>observer?.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']})
  const restoreControls=()=>{
    for(const [button,{marker,parent,next}] of moved){
      if(marker.parentNode===parent)parent.replaceChild(button,marker)
      else if(root.contains(parent))parent.insertBefore(button,next?.parentNode===parent?next:null)
      marker.remove?.()
    }
    moved.clear()
    for(const group of groups)group.remove()
    groups.clear()
  }
  const refresh=()=>{
    observer?.disconnect();updating=true
    try{
      root.dataset.titleView=String(enabled)
      root.querySelectorAll('[data-title-view-toggle]').forEach(button=>button.setAttribute('aria-pressed',String(enabled)))
      if(!enabled){restoreControls();return}
      // Outline parks the ordinary panes intact. Keep their placeholders so a
      // later preference change can restore controls before those panes return.
      const buttons=new Set([...moved.keys(),...root.querySelectorAll('.source-head .pane-language,.care-head .pane-language')])
      for(const button of buttons){
        if(!root.contains(button))continue
        const pane=button.closest('[data-pane]'),slider=pane?.querySelector(':scope>.pane-slider'),sliderVisible=slider&&!slider.hidden&&view.getComputedStyle?.(slider)?.display!=='none'
        const destination=(sliderVisible?slider.querySelector('.slider-heading'):null)||pane?.querySelector(':scope>.window-titlebar')
        if(!destination)continue
        let group=destination.querySelector(':scope>.reader-title-controls')
        if(!group){group=doc.createElement('div');group.className='reader-title-controls';destination.insertBefore(group,destination.querySelector('[data-slider-count]'));groups.add(group)}
        if(!moved.has(button)){
          const parent=button.parentNode,next=button.nextSibling,marker=doc.createComment('title-view-control')
          parent.insertBefore(marker,button);moved.set(button,{marker,parent,next})
        }
        if(button.parentNode!==group)group.appendChild(button)
      }
      for(const group of groups)if(!group.children.length){group.remove();groups.delete(group)}
    }finally{updating=false;if(!disposed)watch()}
  }
  const apply=(value,persist=false)=>{
    const restore=titleViewReadingAnchors(root)
    enabled=value===true;runtime.titleView=enabled;titleViewSessions.set(view,enabled)
    refresh();restore();runtime.queueThreads?.();runtime.queueTrackZoom?.()
    if(persist){
      try{view.localStorage?.setItem(TITLE_VIEW_KEY,String(enabled))}catch(_){}
      if(view.CustomEvent)view.dispatchEvent(new view.CustomEvent(TITLE_VIEW_EVENT,{detail:{enabled}}))
    }
  }
  const click=event=>{
    const control=event.target?.closest?.('[data-title-view-toggle]')
    if(!control||!root.contains(control))return
    event.preventDefault();event.stopImmediatePropagation();apply(!enabled,true)
  }
  const key=event=>{if(event.target?.closest?.('[data-title-view-toggle]')&&[' ','Enter','ArrowUp','ArrowDown','Home','End'].includes(event.key))event.stopImmediatePropagation()}
  const change=event=>{if(typeof event.detail?.enabled==='boolean'&&event.detail.enabled!==enabled)apply(event.detail.enabled)}
  const storage=event=>{if(event.key===TITLE_VIEW_KEY||event.key===null)apply(read())}
  const queueRefresh=()=>{
    if(disposed||updating||frame!==null)return
    frame=view.requestAnimationFrame(()=>{frame=null;if(!disposed){refresh();runtime.queueThreads?.()}})
  }
  if(view.MutationObserver)observer=new view.MutationObserver(records=>{
    const relevant=records.some(record=>{
      const target=record.target.nodeType===1?record.target:record.target.parentElement
      if(record.type==='attributes')return target===root||!!target?.matches?.('.desk-window,.pane-slider')
      if(target?.closest?.('.source-head,.care-head,.slider-heading,.window-titlebar'))return true
      return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches('.desk-window,.source-head,.care-head,[data-title-view-toggle]')||node.querySelector('.desk-window,.source-head,.care-head,[data-title-view-toggle]')))
    })
    if(relevant)queueRefresh()
  })
  root.addEventListener('click',click,true);root.addEventListener('keydown',key,true)
  view.addEventListener(TITLE_VIEW_EVENT,change);view.addEventListener('storage',storage)
  runtime.paintTitleView=refresh
  const cleanup=()=>{
    if(disposed)return
    disposed=true;observer?.disconnect();if(frame!==null)view.cancelAnimationFrame(frame)
    root.removeEventListener('click',click,true);root.removeEventListener('keydown',key,true)
    view.removeEventListener(TITLE_VIEW_EVENT,change);view.removeEventListener('storage',storage)
    restoreControls();delete root.dataset.titleView
    if(runtime.cleanupTitleView===cleanup){runtime.cleanupTitleView=null;runtime.paintTitleView=null}
  }
  runtime.cleanupTitleView=cleanup
  refresh()
  return cleanup
}


const VIBRANT_VIEW_KEY='care-vibrant-view-v1'
const VIBRANT_VIEW_EVENT='care-vibrant-view-change'
const vibrantViewSessions=new WeakMap()
function vibrantViewControl(){
  return '<button type="button" class="title-view-toggle vibrant-view-toggle" data-vibrant-view-toggle aria-pressed="false" title="Quietly rich colours, gently luminous lettering and a deep, inky background"><span>Vibrant colours</span><span class="title-view-switch" aria-hidden="true"></span></button>'
}
function setupVibrantView(runtime){
  runtime.cleanupVibrantView?.()
  const root=runtime.root,view=root?.ownerDocument?.defaultView
  if(!root||!view)return()=>{}
  const read=()=>{const fallback=vibrantViewSessions.get(view)??runtime.vibrantView??false;try{const saved=view.localStorage?.getItem(VIBRANT_VIEW_KEY);return saved===null||saved===undefined?fallback:saved==='true'}catch(_){return fallback}}
  let enabled=read(),disposed=false
  const paint=()=>{root.dataset.vibrantView=String(enabled);if(root.ownerDocument.body)root.ownerDocument.body.dataset.careVibrantView=String(enabled);root.querySelectorAll('[data-vibrant-view-toggle]').forEach(button=>button.setAttribute('aria-pressed',String(enabled)))}
  const apply=(value,persist=false)=>{
    enabled=value===true;runtime.vibrantView=enabled;vibrantViewSessions.set(view,enabled);paint()
    if(persist){try{view.localStorage?.setItem(VIBRANT_VIEW_KEY,String(enabled))}catch(_){};if(view.CustomEvent)view.dispatchEvent(new view.CustomEvent(VIBRANT_VIEW_EVENT,{detail:{enabled}}))}
  }
  const click=event=>{const control=event.target?.closest?.('[data-vibrant-view-toggle]');if(!control||!root.contains(control))return;event.preventDefault();event.stopImmediatePropagation();apply(!enabled,true)}
  const key=event=>{if(event.target?.closest?.('[data-vibrant-view-toggle]')&&[' ','Enter'].includes(event.key))event.stopImmediatePropagation()}
  const change=event=>{if(typeof event.detail?.enabled==='boolean'&&event.detail.enabled!==enabled)apply(event.detail.enabled)}
  const storage=event=>{if(event.key===VIBRANT_VIEW_KEY||event.key===null)apply(read())}
  root.addEventListener('click',click,true);root.addEventListener('keydown',key,true)
  view.addEventListener(VIBRANT_VIEW_EVENT,change);view.addEventListener('storage',storage)
  runtime.paintVibrantView=paint
  const cleanup=()=>{if(disposed)return;disposed=true;root.removeEventListener('click',click,true);root.removeEventListener('keydown',key,true);view.removeEventListener(VIBRANT_VIEW_EVENT,change);view.removeEventListener('storage',storage);delete root.dataset.vibrantView;if(runtime.cleanupVibrantView===cleanup){runtime.cleanupVibrantView=null;runtime.paintVibrantView=null}}
  runtime.cleanupVibrantView=cleanup;apply(enabled)
  return cleanup
}


function axiomCopyAttributes(id=''){
  return id?`data-reader-code title="${esc(id)}"`:''
}
function axiomCopyStatus(){return ''}
function axiomCodeSelection(root){
  return root.getRootNode?.()?.getSelection?.()||root.ownerDocument?.defaultView?.getSelection?.()
}
function setupAxiomCopy(runtime){
  runtime.cleanupAxiomCopy?.()
  const root=runtime.root
  const click=event=>{
    const target=event.target,code=target?.closest?.('[data-reader-code],.passage-address')
    const selection=axiomCodeSelection(root)
    // Let the browser select/copy text normally. A completed drag or a click
    // on metadata must not focus a card, redraw it, or start a route.
    if((code&&root.contains(code))||(selection&&selection.isCollapsed===false&&String(selection)))event.stopImmediatePropagation()
  }
  root.addEventListener('click',click,true)
  const cleanup=()=>{
    root.removeEventListener('click',click,true)
    if(runtime.cleanupAxiomCopy===cleanup)delete runtime.cleanupAxiomCopy
  }
  runtime.cleanupAxiomCopy=cleanup
  return cleanup
}

function renderStudyDesk(component,localNavigation=false){
  const {parentElement,setStateValue,setTriggerValue}=component
  let data=component.data
  const root=parentElement.querySelector("[data-study-desk]");if(!root)return
  try {
    let runtime=INSTANCES.get(parentElement);if(!runtime||runtime.root!==root){runtime?.renderCleanup?.();runtime=setup(root);INSTANCES.set(parentElement,runtime)}
    data=studyNavigationReceive(runtime,component,localNavigation)
    runtime.renderNavigation=next=>renderStudyDesk({...studyNavigationState(runtime).component,data:next},true)
    data=runtime.prepareOriginalFormats(data||{})
    const renderSignature=studyDeskRenderSignature(data)
    const reused=reuseStudyDeskRender(runtime,{...component,data},renderSignature)
    if(reused){studyNavigationPrefetch(runtime);return reused}
    const finishRender=beginStudyDeskRender(runtime)
    root.ownerDocument.defaultView?.addEventListener("care-reference-viewer-ready",runtime.onViewerReady)
    root.addEventListener("click",runtime.onClick)
    root.addEventListener("keydown",runtime.onKey)
    root.addEventListener("contextmenu",runtime.onBookContextMenu)
    root.addEventListener("scroll",runtime.onBookMenuScroll,true)
    root.ownerDocument.addEventListener("pointerdown",runtime.onBookMenuOutside,true)
    root.ownerDocument.defaultView?.addEventListener("resize",runtime.onBookMenuResize)
    root.addEventListener("pointerdown",runtime.onSliderStart)
    root.ownerDocument.addEventListener("pointerup",runtime.onSliderEnd)
    root.ownerDocument.addEventListener("pointercancel",runtime.onSliderEnd)
    root.addEventListener("input",runtime.onSliderInput)
    root.addEventListener("change",runtime.onSliderChange)
    root.addEventListener("pointerup",runtime.onSliderChange)
    root.addEventListener("input",runtime.onRouteDirectionInput)
    root.addEventListener("change",runtime.onRouteDirectionChange)
    root.addEventListener("input",runtime.onShelfInput)
    root.addEventListener("change",runtime.onShelfInput)
    root.addEventListener("change",runtime.onConnectionChange)
    root.addEventListener("change",runtime.onVersionChange)
    root.addEventListener("scroll",runtime.onConnectionTabsScroll,true)
    root.addEventListener("wheel",runtime.onWheel,{passive:false,capture:true})
    root.addEventListener("scroll",runtime.queueThreads,true)
    root.addEventListener("toggle",runtime.queueThreads,true)
    root.addEventListener("toggle",runtime.onSectionToggle,true)
    for(const event of ["pointerover","pointerout","focusin","focusout"])root.addEventListener(event,runtime.onRouteHover)
    runtime.beforeOutlineRender?.()
    const previousData=runtime.data,previousConnection=runtime.data?.connection,previousFocused=runtime.focused
    refreshStudyDeskOutlineContext(runtime,data)
    runtime.api=studyNavigationAPI(runtime,component);runtime.data=data||{}
    const shelfReset=data?.mode==="library"&&runtime.syncShelf(data)
    if(data?.mode==="library")runtime.syncLibrarySelection(data)
    runtime.attachConnectionDiscovery?.()
    runtime.attachBuildVersionMenu?.()
    runtime.attachOriginalDownloads?.()
    runtime.attachOriginalFormats?.()
    runtime.attachSheetVersionMenu?.()
    runtime.attachPaneBookmarks?.()
    runtime.attachSliderJumpMenu?.()
    runtime.attachReaderMenus?.()
    runtime.attachConnectionView?.()
    const bookmarkMenuWork=runtime.bookmarkMenu?.workId||runtime.bookmarkMenuRestore
    runtime.bookmarkMenuRestore=null
    const stopWorkspaceFit=workspaceFitReader(runtime)
    const mode=String(data?.mode||"workspace"),stack=data?.stack||{},nextSignature=`${mode}|${stack?.work?.id||""}|${stack?.active_raw_unit_id||""}|${arr(stack?.care_path).map(unit=>unit.reader_option_id||unit.id).join(",")}${isRouteReference(data?.reference)?`|routes/4:${routeMode(data.reference)}`:""}`,nextReference=String(data?.reference?.id||"")
    const versionMenus=runtime.captureVersionMenus()
    const previousStrip=root.querySelector("[data-strip]"),previousLeft=previousStrip?.scrollLeft||0,signatureChanged=runtime.signature!==nextSignature,referenceChanged=Boolean(nextReference&&runtime.referenceId!==nextReference)
    const sameWork=runtime.workId===String(stack?.work?.id||""),sameReference=runtime.referenceId===nextReference,sameConnection=runtime.connectionId===String(data?.connection?.id||"")
    // Replacing chapter markup must not reset the user's position on each line.
    // Keep offsets while Routes temporarily hides the sliders; reset for a new book.
    if(sameWork)runtime.rememberSliders();else runtime.sliderScrollPositions.clear()
    const resumedSnapshot=(!sameWork||!sameConnection)?workspaceReadSnapshot(root,String(stack?.work?.id||""),nextSignature,nextReference,studyDeskWorkspaceContext(data),String(data?.connection?.id||"")):null
    if(!sameWork){runtime.sectionMemory.clear();runtime.selectedAxiom=data?.selected_axiom||null}
    workspaceRestoreRuntime(runtime,resumedSnapshot)
    runtime.viewerSelectionPending=Boolean(resumedSnapshot?.selectedAxiom)
    // Local selection leads while an acknowledgement is in flight, so a rapid
    // series of arrow presses cannot be rolled back by an older rerun.
    if(!runtime.selectedAxiom)runtime.selectedAxiom=data?.selected_axiom||null
    if(!runtime.isRouting()&&runtime.readerView!=="outline"&&runtime.selectedAxiom){
      const selection=runtime.selectedAxiom,valid=selection.passage_id?String(stack.active_chapter?.raw_unit_id)===selection.unit_id&&arr(stack.active_chapter?.passages).some(item=>String(item.id)===selection.passage_id):arr(stack.care_path).some(unit=>String(unit.id)===selection.unit_id&&arr(unit.sections).some(section=>arr(section.items).some(item=>String(item.id)===selection.axiom_id)))
      if(!valid)runtime.selectedAxiom=null
    }
    const hadDeskFocus=Boolean(root.querySelector(":focus")),activeReading=root.querySelector("[data-select-axiom]:focus,[data-open-axiom-routes]:focus,[data-select-passage]:focus,[data-open-passage-routes]:focus"),readingFocus=activeReading?{id:activeReading.dataset.selectPassage||activeReading.dataset.openPassageRoutes||activeReading.dataset.selectAxiom||activeReading.dataset.openAxiomRoutes,passage:Boolean(activeReading.dataset.selectPassage||activeReading.dataset.openPassageRoutes),routes:Boolean(activeReading.dataset.openPassageRoutes||activeReading.dataset.openAxiomRoutes)}:null
    const favouriteFocus=root.querySelector("[data-favourite-axiom]:focus")?.dataset.favouriteAxiom
    if(sameWork&&!runtime.referenceId)root.querySelectorAll("[data-reading-sheet]").forEach(runtime.rememberSections)
    const previousLayer=paneLayerKey(root.querySelector(`[data-pane="${CSS.escape(runtime.focused)}"]`))
    const readingPositions=new Map([...root.querySelectorAll(".window-body")].map(body=>[body.dataset.readingId||body.closest("[data-pane]")?.dataset.pane,{top:body.scrollTop,sections:[...body.querySelectorAll(".care-section")].map(section=>section.open)}]))
    if(sameWork&&sameConnection&&!previousConnection?.reference&&data?.connection?.reference)runtime.connectionReadingPosition={positions:readingPositions,left:previousLeft,focused:runtime.focused}
    const returningToConnection=sameWork&&sameConnection&&previousConnection?.reference&&!data?.connection?.reference
    if(sameWork&&!runtime.referenceId&&nextReference)runtime.bookPosition={positions:readingPositions,left:previousLeft,layer:previousLayer}
    if(!resumedSnapshot&&(!sameWork||runtime.workspaceContentContext!==studyDeskWorkspaceContext(data)))runtime.bookPosition=null
    if(!sameWork||!sameConnection){runtime.discoveryShelfOpen=false;runtime.discoveryGate={}}
    runtime.workspaceContext=data?.workspace_context||""
    runtime.workspaceContentContext=studyDeskWorkspaceContext(data)
    const returningToBook=sameWork&&Boolean(runtime.referenceId)&&!nextReference
    const sliderFocused=Boolean(root.querySelector("[data-sheet-slider]:focus"))
    const directionFocused=Boolean(root.querySelector("[data-route-direction]:focus"))
    const historyButton=root.querySelector("[data-route-history]:focus,[data-connection-route-history]:focus")
    const historyAttribute=historyButton?.hasAttribute("data-connection-route-history")?"data-connection-route-history":"data-route-history",historyFocused=historyButton?.getAttribute(historyAttribute)
    const previousShelfTop=root.querySelector(".library-window")?.scrollTop||0
    // Selection-only state acknowledgements keep the actual focused DOM node.
    // Routes always follows its original render/restore/centring path below.
    const reuseReading=mode==="workspace"&&runtime.renderSignature===renderSignature
    const reuseShelf=mode==="library"&&runtime.renderSignature===renderSignature
    if(!reuseReading&&!reuseShelf){runtime.closeReaderMenu?.();runtime.closeSliderJumpMenu?.();runtime.closeBookMenu();runtime.closeConnectionDiscovery?.();runtime.closeBuildVersionMenu?.();runtime.closeOriginalFormats?.();runtime.closeOriginalDownloads?.();runtime.closeSheetVersionMenu?.();runtime.closeConnectionResolution?.();runtime.closeBookmarkMenu?.();replaceStudyDeskMarkup(runtime,mode==="library"?library(runtime.librarySelectionData(),runtime.shelf):workspace(studyNavigationRenderData(runtime,originalReaderRenderData(runtime,data),previousData,localNavigation)))}
    runtime.renderSignature=renderSignature
    if(mode==="library"){root.querySelector(".library-window").scrollTop=shelfReset?0:previousShelfTop;runtime.paintLibrarySelection()}
    root.removeAttribute("aria-busy")
    runtime.pendingSlider=null
    runtime.applySkin()
    runtime.applyTextScale()
    setupBeautifulText(runtime)
    setupTitleView(runtime)
    setupVibrantView(runtime)
    setupAxiomCopy(runtime)
    runtime.paintConnectionView?.()
    runtime.restoreReaderMenu?.()
    if(sameWork)runtime.restoreVersionMenus(versionMenus)
    runtime.refreshSliders?.()
    if(!reuseReading)runtime.restoreConnectionLayers?.()
    runtime.paintConnectionTabs?.()
    runtime.signature=nextSignature;runtime.referenceId=nextReference;runtime.workId=String(stack?.work?.id||"");runtime.connectionId=String(data?.connection?.id||"")
    const strip=root.querySelector("[data-strip]")
    if(strip){strip.addEventListener("scroll",runtime.onScroll,{passive:true});if(sameWork)strip.scrollLeft=previousLeft}
    // Direction changes can relocate different sections into peer panes.
    // Restore index-based section flags only for the same route layout.
    if(sameWork&&sameReference&&(!nextReference||!signatureChanged))root.querySelectorAll(".window-body").forEach(body=>{const saved=readingPositions.get(body.dataset.readingId||body.closest("[data-pane]")?.dataset.pane);if(saved){body.querySelectorAll(".care-section").forEach((section,index)=>{section.open=saved.sections[index]??section.open});body.scrollTop=saved.top}})
    if(returningToBook&&runtime.bookPosition){root.querySelectorAll(".window-body[data-reading-id]").forEach(body=>{const saved=runtime.bookPosition.positions.get(body.dataset.readingId);if(saved){body.querySelectorAll(".care-section").forEach((section,index)=>{section.open=saved.sections[index]??section.open});body.scrollTop=saved.top}});if(strip)strip.scrollLeft=runtime.bookPosition.left}
    if(!runtime.isRouting()){
      root.querySelectorAll("[data-reading-sheet]").forEach(pane=>{const saved=runtime.sectionMemory.get(pane.dataset.pane);if(saved)pane.querySelectorAll(".care-section").forEach((section,index)=>{section.open=saved[index]??section.open})})
    }
    runtime.paintSelection()
    decorateReadingActions(runtime)
    if(!reuseReading&&sameWork&&favouriteFocus)root.querySelector(`[data-favourite-axiom="${CSS.escape(favouriteFocus)}"]`)?.focus({preventScroll:true})
    const restoreFocus=readingFocus||(returningToBook&&hadDeskFocus&&runtime.selectedAxiom?{id:runtime.selectedAxiom.passage_id||runtime.selectedAxiom.axiom_id,passage:Boolean(runtime.selectedAxiom.passage_id),routes:false}:null)
    if(!reuseReading&&sameWork&&restoreFocus){const kind=restoreFocus.passage?"passage":"axiom",attribute=restoreFocus.routes?`data-open-${kind}-routes`:`data-select-${kind}`,target=root.querySelector(`[${attribute}="${CSS.escape(restoreFocus.id)}"]`);if(target){const section=target.closest("details");if((restoreFocus.passage||section?.open||(runtime.isRouting()&&!section))&&!target.hidden)target.focus({preventScroll:true});else section?.querySelector("summary")?.focus({preventScroll:true})}}
    const alignedLayer=runtime.pendingLayer||(returningToBook?runtime.bookPosition?.layer:null)||previousLayer,alignedPane=paneForLayer(root,alignedLayer)
    runtime.focused=sameWork?(alignedPane?.dataset.pane||"source"):"source"
    const preserveRoutePosition=sameWork&&sameReference&&!signatureChanged&&Boolean(nextReference)&&root.querySelector(`[data-pane="${CSS.escape(previousFocused||"")}"]`)
    if(preserveRoutePosition)runtime.focused=previousFocused
    const selectedPane=preserveRoutePosition?null:centreSelectedReference(root,data?.reference)
    if(selectedPane)runtime.focused=selectedPane
    const connectionReference=data?.connection?.reference
    const preserveConnectionPosition=sameWork&&sameConnection&&Boolean(data?.connection?.id)&&connectionViewportKey(previousConnection)===connectionViewportKey(data.connection)&&root.querySelector(`[data-pane="${CSS.escape(previousFocused||"")}"]`)
    if(preserveConnectionPosition)runtime.focused=previousFocused
    else if(connectionReference&&!reuseReading)centreConnectionReference(runtime)
    else if(!sameConnection&&data?.connection&&!resumedSnapshot){const pane=root.querySelector("[data-connection-field]");centreConnectionPane(runtime,pane)}
    if(referenceChanged)root.querySelector(".route-arrival")?.classList.add("route-arrival-new")
    runtime.paintFocus()
    if(sliderFocused&&runtime.pendingLayer)root.querySelector(`[data-sheet-slider="${CSS.escape(runtime.pendingLayer)}"]`)?.focus({preventScroll:true})
    if(directionFocused)root.querySelector("[data-route-direction]")?.focus({preventScroll:true})
    if(historyFocused){const target=root.querySelector(`[${historyAttribute}="${historyFocused}"]:not(:disabled)`)||root.querySelector(`[${historyAttribute}]:not(:disabled)`)||root.querySelector(".route-history-actions .route-close");target?.focus({preventScroll:true})}
    if(returningToConnection&&runtime.connectionReadingPosition){const saved=runtime.connectionReadingPosition;root.querySelectorAll(".window-body[data-reading-id]").forEach(body=>{const position=saved.positions.get(body.dataset.readingId);if(position){body.querySelectorAll(".care-section").forEach((section,index)=>{section.open=position.sections[index]??section.open});body.scrollTop=position.top}});if(strip)strip.scrollLeft=saved.left;runtime.focused=saved.focused;runtime.paintFocus()}
    runtime.syncConnectionShelf?.()
    installPaneControls(root,runtime.paneControlState||(runtime.paneControlState={}),()=>{runtime.queueTrackZoom();runtime.queueThreads();runtime.positionDialoguePlayer?.()},String(data?.stack?.work?.id||""))
    runtime.mountDialoguePlayer()
    runtime.restoreSliderJumpMenu(reuseReading)
    if(bookmarkMenuWork===String(data?.stack?.work?.id||""))runtime.openBookmarkMenu(root.querySelector("[data-bookmark-menu]"),{restore:true})
    runtime.pendingLayer=null
    const view=root.ownerDocument.defaultView
    runtime.queueThreads()
    workspaceRestorePosition(runtime,resumedSnapshot)
    runtime.stopOriginalReader=runtime.mountOriginalReader({sameWork,resumed:Boolean(resumedSnapshot),formatSwitch:Boolean(runtime.originalFormatEntry?.preferred&&runtime.originalState?.id!==data?.stack?.original_reader?.id)})
    runtime.resumeOriginalFormat?.()
    let resumeOnResize=applySavedPaneFocus(runtime)?null:resumedSnapshot
    let initialRouteLayout=true
    const stopTrackZoom=runtime.watchTrackZoom()
    const stopWorkspaceWatch=workspaceWatchReader(runtime)
    const stopDialogueWatch=runtime.watchDialoguePlayer()
    const resize=view?.ResizeObserver?new view.ResizeObserver(()=>{if(resumeOnResize){workspaceRestorePosition(runtime,resumeOnResize);resumeOnResize=null}else if(initialRouteLayout&&data?.connection?.reference){if(!preserveConnectionPosition&&centreConnectionReference(runtime))runtime.paintFocus()}else if(initialRouteLayout&&data?.reference&&!preserveRoutePosition){const selected=centreSelectedReference(root,data.reference);if(selected){runtime.focused=selected;runtime.paintFocus()}}if(applySavedPaneFocus(runtime))resumeOnResize=null;initialRouteLayout=false;runtime.queueThreads()}):null
    if(resize){resize.observe(root);const text=root.querySelector(".axiom-button.selected .axiom-text");if(text)resize.observe(text)}
    if(runtime.loadTimer&&view)view.clearTimeout(runtime.loadTimer)
    const loader=root.querySelector("[data-load-screen]")
    // The reader data and DOM are ready; do not add a timed input-blocking delay.
    loader?.remove()
    runtime.applyOutline?.()
    studyNavigationPrefetch(runtime)
    return finishRender(()=>{runtime.cleanupAxiomCopy?.();runtime.cleanupTitleView?.();runtime.cleanupVibrantView?.();runtime.cleanupBeautifulText?.();runtime.cleanupReaderMenus?.();runtime.cleanupConnectionView?.();view?.removeEventListener("care-reference-viewer-ready",runtime.onViewerReady);runtime.closeBookMenu();runtime.cleanupConnectionDiscovery?.();runtime.cleanupBuildVersionMenu?.();runtime.cleanupOriginalDownloads?.();runtime.cleanupOriginalFormats?.();runtime.cleanupSheetVersionMenu?.();runtime.cleanupPaneBookmarks?.();runtime.cleanupSliderJumpMenu?.();root.removeEventListener("contextmenu",runtime.onBookContextMenu);root.removeEventListener("scroll",runtime.onBookMenuScroll,true);root.ownerDocument.removeEventListener("pointerdown",runtime.onBookMenuOutside,true);view?.removeEventListener("resize",runtime.onBookMenuResize);stopTrackZoom();stopWorkspaceWatch();stopDialogueWatch();runtime.stopOriginalReader?.();runtime.stopOriginalReader=null;stopWorkspaceFit();resize?.disconnect();const current=INSTANCES.get(parentElement);if(current!==runtime)return;root.removeEventListener("click",runtime.onClick);root.removeEventListener("keydown",runtime.onKey);root.removeEventListener("wheel",runtime.onWheel,true);root.removeEventListener("input",runtime.onShelfInput);root.removeEventListener("change",runtime.onShelfInput);root.removeEventListener("change",runtime.onConnectionChange);root.removeEventListener("change",runtime.onVersionChange);root.removeEventListener("scroll",runtime.onConnectionTabsScroll,true);root.removeEventListener("pointerdown",runtime.onSliderStart);root.ownerDocument.removeEventListener("pointerup",runtime.onSliderEnd);root.ownerDocument.removeEventListener("pointercancel",runtime.onSliderEnd);root.removeEventListener("input",runtime.onSliderInput);root.removeEventListener("change",runtime.onSliderChange);root.removeEventListener("pointerup",runtime.onSliderChange);root.removeEventListener("input",runtime.onRouteDirectionInput);root.removeEventListener("change",runtime.onRouteDirectionChange);root.removeEventListener("scroll",runtime.queueThreads,true);root.removeEventListener("toggle",runtime.queueThreads,true);root.removeEventListener("toggle",runtime.onSectionToggle,true);for(const event of ["pointerover","pointerout","focusin","focusout"])root.removeEventListener(event,runtime.onRouteHover);if(runtime.threadFrame&&view){view.cancelAnimationFrame(runtime.threadFrame);runtime.threadFrame=null}if(runtime.scrollTimer&&view)view.clearTimeout(runtime.scrollTimer);if(runtime.loadTimer&&view)view.clearTimeout(runtime.loadTimer)})
  } catch(error) {
    INSTANCES.get(parentElement)?.disposeDialoguePlayer?.()
    root.innerHTML=`<div class="inspector-empty"><div><b>THE DESK COULD NOT DRAW</b><p>${esc(error?.stack||error)}</p></div></div>`
  }
}
function mount(component){return renderStudyDesk(component)}

// Single-sheet readers use the canonical pane, selection, route, bookmark,
// keyboard and reading controls. Only the surrounding multi-layer workspace differs.
function corpusBuildRouteWindows(data){
  const reference=data.connection?.reference;if(!reference)return null
  const panes=arr(data.corpus_route_panes),index=new Map(panes.map(pane=>[pane.id,pane]))
  const rank=item=>{const pane=index.get(item.source_pane)||item,layer=String(item.layer||pane.layer||'');return layer==='WB'||(layer==='CB'&&pane.role==='origin')?1:layer==='CL'?2:layer==='MC'?3+(mcLevel({...pane,mc_level:pane.macro_level||pane.mc_level})||1)/100:layer==='CB'?4:layer==='SOURCE'||layer==='PASSAGE'?0:layer==='CH'?.5:5}
  const selected={...reference,kind:reference.kind||'axiom',reader_rank:rank(reference)},groups=new Map(),seen=new Set()
  for(const item of Object.values(reference.route_layers||{}).flatMap(arr)){
    const key=(item.source_pane||'')+'|'+item.id;if(seen.has(key)||key===(reference.source_pane||'')+'|'+reference.id)continue;seen.add(key)
    const pane=index.get(item.source_pane),level=item.layer==='MC'?mcLevel({...pane,...item,mc_level:pane?.macro_level||pane?.mc_level||item.mc_level}):null
    const row={...item,...(level?{mc_level:level}:{}),sheet_title:item.sheet_title||pane?.title||item.work_title||item.unit_id}
    const slot=item.layer+(level?':'+level:'')+'|'+rank(item)
    if(!groups.has(slot))groups.set(slot,{type:item.layer,mc_level:level,rank:rank(item),items:[]})
    groups.get(slot).items.push(row)
  }
  const units=[...groups.values()].sort((a,b)=>a.rank-b.rank).map((group,index)=>{
    const id='corpus-route-'+index,unit={id,type:group.type,mc_level:group.mc_level,reader_rank:group.rank===selected.reader_rank?group.rank-.001:group.rank,sections:[],items:[],pane_accent:group.rank===1?layerColor('WB'):layerColor(group.type,{mc_level:group.mc_level})}
    const ref={...selected,route_layers:{...reference.route_layers,[group.type]:group.items}}
    return {rank:unit.reader_rank,id:connectionPaneId('field',id,id),html:connectionScopeMarkup(carePane(unit,index,reference.id,ref,{}),'field',id),layer:readerLayerLabel(group.type,unit)}
  })
  const target=index.get(reference.source_pane),targetUnit=target?connectionFieldUnit(target):{id:reference.unit_id||'corpus-route-target',type:reference.layer,title:reference.sheet_title||reference.unit_id,sections:[{name:'Selected axiom',items:[{...reference,text:reference.text||reference.item_text}]}],items:[reference]}
  if(!arr(targetUnit.sections).length)targetUnit.sections=[{name:'Saved reading',number:'1',items:arr(targetUnit.items)}]
  targetUnit.reader_rank=selected.reader_rank;targetUnit.mc_level=mcLevel({...target,...reference,mc_level:target?.macro_level||target?.mc_level||reference.mc_level})
  const targetScope=reference.source_pane||targetUnit.id,targetHTML=connectionScopeMarkup(carePane(targetUnit,units.length,reference.id,selected,{}),'field',targetScope)
  units.push({rank:selected.reader_rank,id:connectionPaneId('field',targetScope,targetUnit.id),html:targetHTML,layer:readerLayerLabel(targetUnit.type,targetUnit)})
  units.sort((a,b)=>a.rank-b.rank)
  return {windows:units.map(unit=>unit.html).join(''),tabs:units.map(unit=>paneTab(unit.id,unit.layer)).join('')}
}

const fullBookWorkspace=workspace
workspace=function(data){
  if(data?.corpus_build){
    const stack=data.stack||{},units=arr(stack.care_path),route=corpusBuildRouteWindows(data),tabs=route?.tabs||units.map(unit=>paneTab(unit.id,readerLayerLabel(unit.type,unit))).join('')
    const reference=data.connection?.reference,mode=routeMode(reference),label=mode==='incoming'?`${esc(reference?.layer)} → WB`:mode==='outgoing'?`${esc(reference?.layer)} → CB`:`WB → ${esc(reference?.layer)} → CB`
    const toolbar=reference?`<div class="route-toolbar"><span>ROUTE · ${label}</span>${routeHistoryControls(data.connection.route_history||{},{connected:true})}</div>`:''
    return `<div class="desk-toolbar desk-menu-toolbar corpus-build-tools">${readerMenuBar(data,tabs)}${toolbar}<div class="desk-title" title="${esc(stack.work?.title||'Corpus')}"><strong>${esc(stack.work?.title||'Corpus')}</strong><span>${esc(data.corpus_caption||'Whole books → corpus')}</span></div></div><div class="desk-strip" data-strip>${route?.windows||units.map((unit,index)=>carePane(unit,index,'',null,stack,new Set(),true,bookBookmarks(data),true)).join('')}</div><div class="desk-status"><span class="status-cell focus" data-focus-label>FOCUS · WB</span><span class="status-cell">${arr(stack.sheet_options?.CORPUS_INPUT).length} INPUTS</span></div><span id="desk-selection-help" class="desk-selection-help">Choose a whole book or corpus sheet from its contents. Select an axiom and open Routes to follow its exact sources.</span>`
  }
  if(!data?.corpus_sheet)return fullBookWorkspace(data)
  const stack=data.stack||{},unit=arr(stack.care_path)[0]
  const tabs=unit?paneTab(unit.id,readerLayerLabel(unit.type,unit)):''
  return `<div class="desk-toolbar desk-menu-toolbar corpus-sheet-tools">${readerMenuBar(data,tabs)}<div class="desk-title" title="${esc(stack.work?.title||unit?.title||'Saved reading')}"><strong>${esc(stack.work?.title||unit?.title||'Saved reading')}</strong><span>${esc(data.corpus_caption||'Saved reading')}</span></div></div><div class="desk-strip" data-strip>${unit?carePane(unit,0,'',null,stack,new Set(),true,bookBookmarks(data),true):''}</div><div class="desk-status"><span class="status-cell focus" data-focus-label>FOCUS · ${esc(unit?.type||'READING')}</span></div><span id="desk-selection-help" class="desk-selection-help">Select an axiom. Up and Down move through the sheet. Tab to Routes to follow its sources.</span>`
}

return {
  mount,
  readerMenuBar,
  setupReaderMenus,
  readerViewOptions,
  titleViewControl,
  vibrantViewControl,
  setupVibrantView,
  paneSimpleTitle,
  readerPaneImprint,
  setupTitleView,
  axiomCopyAttributes,
  axiomCopyStatus,
  setupAxiomCopy,
  connectionViewControl,
  setupConnectionView,
  displayRouteEdges,
  readerMenu,
  etchedRouteIcon,
  bookmarkIcon,
  mcLevel,
  readerLayerLabel,
  layerColor,
  restoreControls(parentElement){
    const runtime=INSTANCES.get(parentElement)
    if(runtime)installPaneControls(runtime.root,runtime.paneControlState||{},()=>{runtime.queueTrackZoom();runtime.queueThreads()},String(runtime.data?.stack?.work?.id||''))
  },
  runtime: parentElement => INSTANCES.get(parentElement) || null,
  fit(parentElement){
    const runtime=INSTANCES.get(parentElement)
    runtime?.setTrackZoom("fit")
    return runtime?.trackZoomState().scale || 1
  },
  zoom(parentElement,action){
    const runtime=INSTANCES.get(parentElement),value=({"+":"in","-":"out"})[action]||action
    if(runtime&&["fit","read","in","out"].includes(value))runtime.setTrackZoom(value)
    return runtime?.trackZoomState().scale || 1
  },
  focus(parentElement,paneId){INSTANCES.get(parentElement)?.focus(String(paneId))},
  fieldUnit: pane => connectionFieldUnit(pane),
  fieldPane(pane,index=0,selectedId=""){
    return carePane(connectionFieldUnit(pane),index,selectedId,null,{})
  },
  workspace,
  corpusBuildRouteWindows,
}
})();

function installPaneControls(root,states,onChange=()=>{},scope=""){
  for(const pane of root.querySelectorAll(".desk-window[data-pane],.field-pane[data-pane]")){
    const bar=pane.querySelector(":scope > .window-titlebar,:scope > .pane-top")
    if(!bar||pane.dataset.pane==="connection:explore")continue
    const key=scope+"|"+pane.dataset.pane,state=states[key]||(states[key]={}),name=(bar.querySelector("strong .reader-full-title")||bar.querySelector("strong"))?.textContent?.trim()||"pane"
    let controls=bar.querySelector(".care-pane-controls")
    if(!controls){controls=root.ownerDocument.createElement("div");controls.className="care-pane-controls";controls.setAttribute("role","group");controls.setAttribute("aria-label",`Controls for ${name}`);for(const [action,glyph] of [["minimize","−"],["sections","⌃"]]){const button=root.ownerDocument.createElement("button");button.type="button";button.dataset.paneControl=action;button.textContent=glyph;controls.append(button)}bar.prepend(controls)}
    const hasSections=[...pane.querySelectorAll("details")].some(section=>!section.matches?.(".sheet-versions")),sectionControl=[...controls.children].find(button=>button.dataset.paneControl==="sections")
    if(!hasSections)sectionControl?.remove()
    else if(!sectionControl){const button=root.ownerDocument.createElement("button");button.type="button";button.dataset.paneControl="sections";controls.append(button)}
    const paint=()=>{
      if(!pane.classList.contains("care-pane-minimized")){
        const a=controls.getBoundingClientRect(),b=bar.getBoundingClientRect()
        if(a.width&&b.width){
          // Coordinates stay relative to the title bar, but pane width includes
          // its borders. Keep those borders so the fixed dot is also centred.
          const borderWidth=Math.max(0,Number(pane.offsetWidth||0)-Number(pane.clientWidth||0))
          // Bounding rectangles are already scaled by track zoom. Convert
          // back to layout pixels before storing values that will scale again.
          const scale=(pane.getBoundingClientRect?.().width/Number(pane.offsetWidth))||1
          pane.style.setProperty("--care-controls-top",`${(a.top-b.top)/scale}px`)
          pane.style.setProperty("--care-controls-left",`${(a.left-b.left)/scale}px`)
          pane.style.setProperty("--care-folded-width",`${(2*(a.left-b.left)+(controls.firstElementChild?.getBoundingClientRect().width||16*scale))/scale+borderWidth}px`)
        }
      }
      pane.classList.toggle("care-pane-minimized",Boolean(state.minimized))
      for(const button of controls.children){const action=button.dataset.paneControl,label=action==="minimize"?(state.minimized?"Restore":"Minimise")+` ${name}`:([...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open)?"Fold":"Unfold")+` all sections in ${name}`;button.title=label;button.setAttribute("aria-label",label);button.setAttribute("aria-pressed",String(action==="minimize"?Boolean(state.minimized):![...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open)));const folded=![...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")).some(section=>section.open),path=action==="minimize"?(state.minimized?"M2 6h8M6 2v8":"M2 6h8"):(folded?"M3 4l3-3 3 3M3 8l3 3 3-3":"M3 1l3 3 3-3M3 11l3-3 3 3");button.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${path}"/></svg>`;if(action==="sections")button.disabled=![...pane.querySelectorAll("details")].some(section=>!section.matches?.(".sheet-versions"))}
    }
    // Assign a local handler so repeated renders neither duplicate events nor
    // invoke Streamlit. The reading body and scroll positions stay mounted.
    controls.onclick=event=>{const button=event.target.closest("[data-pane-control]");if(!button)return;event.preventDefault();event.stopPropagation();const action=button.dataset.paneControl;if(action==="minimize")state.minimized=!state.minimized;else{const sections=[...pane.querySelectorAll("details")].filter(section=>!section.matches?.(".sheet-versions")),open=!sections.some(section=>section.open);sections.forEach(section=>section.open=open)}paint();onChange(pane)}
    paint()
  }
}

const resolutionDepthOrder=["WB","MC","CL","CH","SOURCE"]
const resolutionLayerColour=layer=>({DIRECT:"#a895be",WB:"#9a4327",MC:"#594f88",CL:"#2d6b67",CH:"#3d668b",SOURCE:"#8a431d",CB:"#a96624",XR:"#6e4f9a",XS:"#8b4f86",SC:"#8f394b"})[layer]||"#a895be"
function resolutionUnitTitle(unit){
  const id=String(unit.unit_id||""),macro=id.match(/^MC_.+_L(\d+)_(\d+)$/),numbered=id.match(/^(CL|CH)_.+_(\d+)$/)
  if(macro)return `Level ${Number(macro[1])} · Reading ${Number(macro[2])}`
  if(numbered)return `${numbered[1]} ${Number(numbered[2])}`
  if(unit.title&&unit.title!==unit.work_title)return unit.title
  if(id.startsWith("MC_"))return id.slice(3).toLowerCase().replaceAll("_"," ").replace(/^./,letter=>letter.toUpperCase())
  return unit.title||id
}
function resolutionStops(reference){const available=new Set(arr(reference?.resolution_choices?.units).map(unit=>unit.layer));return ["DIRECT",...resolutionDepthOrder.filter(layer=>available.has(layer))]}
function resolutionForDepth(reference,stop){
  if(stop==="DIRECT")return {mode:"immediate"}
  if(stop==="SOURCE")return {mode:"full"}
  const depth=resolutionDepthOrder.indexOf(stop),available=new Set(arr(reference?.resolution_choices?.units).map(unit=>unit.layer))
  return {mode:"selected",layers:[...available].filter(layer=>!resolutionDepthOrder.includes(layer)||resolutionDepthOrder.indexOf(layer)<=depth),pane_ids:[]}
}
function resolutionDepthIndex(reference,resolution){
  const stops=resolutionStops(reference);if(resolution?.mode==="full")return stops.length-1
  if(resolution?.mode!=="selected")return 0
  if(arr(resolution.pane_ids).length)return -1
  return stops.findIndex(stop=>{const candidate=resolutionForDepth(reference,stop);return candidate.mode==="selected"&&JSON.stringify([...candidate.layers].sort())===JSON.stringify([...arr(resolution.layers)].sort())})
}
function connectionResolutionControl(data){
  const reference=data?.connection?.reference;if(!reference)return ""
  const resolution=data.connection.resolution||{},index=resolutionDepthIndex(reference,resolution),stop=resolutionStops(reference)[index],label=resolution.mode==="full"?"Full path":index<0?"Selected readings":stop&&stop!=="DIRECT"?`To ${stop}`:"Direct inputs"
  return `<button type="button" class="desk-action" data-connection-resolution aria-haspopup="dialog" title="Choose layers and individual readings along this route">Resolution · ${label}</button>`
}
function setupConnectionResolution(runtime){
  const root=runtime.root
  runtime.closeConnectionResolution=()=>{root.querySelector(".connection-resolution-panel")?.remove()}
  runtime.openConnectionResolution=()=>{
    runtime.closeConnectionResolution()
    runtime.beforeResolutionOpen?.()
    const connection=runtime.data?.connection,reference=connection?.reference;if(!reference)return
    const choices=reference.resolution_choices||{},units=arr(choices.units).filter(unit=>connection.hide_xa===false||unit.layer!=="XA"),layers=[...new Set(units.map(unit=>unit.layer))].sort((a,b)=>["SC","XS","XR","CB","WB","MC","CL","CH","SOURCE"].indexOf(a)-["SC","XS","XR","CB","WB","MC","CL","CH","SOURCE"].indexOf(b)),resolution=connection.resolution||{},visible=new Set(Object.values(reference.route_layers||{}).flatMap(arr).map(item=>item.source_pane)),explicit=new Set(arr(resolution.pane_ids)),selected=unit=>resolution.mode==="full"||explicit.has(unit.id)||arr(resolution.layers).includes(unit.layer)||(resolution.mode!=="selected"&&visible.has(unit.id))
    const element=root.ownerDocument.createElement("section");element.className="connection-resolution-panel";element.setAttribute("role","dialog");element.setAttribute("aria-label","Route resolution")
    const stops=resolutionStops(reference),depth=resolutionDepthIndex(reference,resolution),current=Math.max(0,depth),stopLabel=stop=>stop==="DIRECT"?"Direct inputs":stop==="SOURCE"?"Full path to source":`Through ${stop}`,missing=resolutionDepthOrder.filter(layer=>!stops.includes(layer))
    element.innerHTML=`<header><h3>${connection.overview?'Reading resolution':'Route resolution'}</h3><button type="button" data-resolution-close aria-label="Close route resolution">×</button></header><p>${connection.overview?'Choose the reading depth for both books, or select each book’s layers below.':'Move toward the source to unfold the route on either side. Only the readings behind this axiom appear.'}</p><div class="resolution-depth" style="--resolution-accent:${resolutionLayerColour(stops[current])};--resolution-gradient:linear-gradient(90deg,${stops.map(resolutionLayerColour).join(",")})"><div class="resolution-depth-heading"><span>Reading depth</span><output data-resolution-depth-label>${depth<0?"Selected readings":stopLabel(stops[current])}</output></div><div class="resolution-depth-rail"><input type="range" data-resolution-depth min="0" max="${stops.length-1}" step="1" value="${current}" aria-label="Route depth" aria-valuetext="${esc(stopLabel(stops[current]))}" ${stops.length<2?"disabled":""}><div class="resolution-depth-stops">${stops.map((stop,index)=>`<button type="button" class="resolution-depth-stop" data-resolution-stop="${esc(stop)}" style="--stop-color:${resolutionLayerColour(stop)}" aria-current="${index===depth}" title="${esc(stopLabel(stop))}"><span>${stop==="DIRECT"?"Direct":stop==="SOURCE"?"Source":stop}</span></button>`).join("")}</div></div></div>${missing.length?`<p class="resolution-availability">No saved ${missing.join(" / ")} ${missing.length===1?"layer":"layers"} on this route.</p>`:""}${runtime.resolutionExtras?.()||''}<details class="resolution-custom" ${depth<0?"open":""}><summary>Choose individual layers & readings</summary><div class="resolution-custom-actions"><button type="button" data-resolution-clear>Clear selection</button></div>${layers.map(layer=>`<details><summary><span class="resolution-unit-title" style="--stop-color:${resolutionLayerColour(layer)}"><i></i>${esc(layer)} <small>${units.filter(unit=>unit.layer===layer).length}</small></span><button type="button" data-resolution-layer="${esc(layer)}">Select layer</button></summary>${units.filter(unit=>unit.layer===layer).map(unit=>`<label><input type="checkbox" data-resolution-unit="${esc(unit.id)}" data-resolution-unit-layer="${esc(layer)}" ${selected(unit)?"checked":""}><span><b>${esc(resolutionUnitTitle(unit))}</b><small>${esc([unit.work_title,unit.unit_id,unit.version].filter(Boolean).join(" · "))}</small></span></label>`).join("")}</details>`).join("")}<footer><button type="button" data-resolution-apply>Show selected readings</button></footer></details>${!units.length?'<p>No further saved layers are available for this route.</p>':""}${reference.route_truncated?'<p>This path is larger than the current display limit. Open a branch to continue.</p>':""}${arr(reference.route_limitations).length?`<details><summary>Source availability · ${arr(reference.route_limitations).length}</summary>${arr(reference.route_limitations).map(note=>`<p>${esc(typeof note==="string"?note:note.message||note.reason||"An exact saved source mapping is unavailable for part of this path.")}</p>`).join("")}</details>`:""}`
    const slider=element.querySelector("[data-resolution-depth]")
    if(slider){slider.oninput=()=>{const stop=stops[Number(slider.value)];element.querySelector("[data-resolution-depth-label]").textContent=stopLabel(stop);slider.setAttribute("aria-valuetext",stopLabel(stop));element.querySelector(".resolution-depth").style.setProperty("--resolution-accent",resolutionLayerColour(stop));element.querySelectorAll("[data-resolution-stop]").forEach(button=>button.setAttribute("aria-current",String(button.dataset.resolutionStop===stop)))};slider.onchange=()=>{runtime.connectionAction({action:"resolution",resolution:resolutionForDepth(reference,stops[Number(slider.value)])});runtime.closeConnectionResolution()}}

    root.append(element);element.querySelector("[data-resolution-close]")?.focus({preventScroll:true})
  }
  const onClick=runtime.onConnectionClick
  runtime.onConnectionClick=event=>{
    const target=event.target
    if(target.closest?.("[data-connection-resolution]")){runtime.openConnectionResolution();return true}
    const panel=target.closest?.(".connection-resolution-panel")
    if(panel){
      if(target.closest("[data-resolution-close]")){runtime.closeConnectionResolution();return true}
      const stop=target.closest("[data-resolution-stop]")
      if(stop){runtime.connectionAction({action:"resolution",resolution:resolutionForDepth(runtime.data.connection.reference,stop.dataset.resolutionStop)});runtime.closeConnectionResolution();return true}
      if(target.closest("[data-resolution-clear]")){panel.querySelectorAll("[data-resolution-unit]").forEach(input=>input.checked=false);return true}
      const mode=target.closest("[data-resolution-mode]")
      if(mode){runtime.connectionAction({action:"resolution",resolution:{mode:mode.dataset.resolutionMode}});runtime.closeConnectionResolution();return true}
      const layer=target.closest("[data-resolution-layer]")
      if(layer){event.preventDefault();const boxes=[...panel.querySelectorAll("[data-resolution-unit]")].filter(input=>input.dataset.resolutionUnitLayer===layer.dataset.resolutionLayer),checked=!boxes.every(input=>input.checked);boxes.forEach(input=>input.checked=checked);return true}
      if(target.closest("[data-resolution-apply]")){runtime.connectionAction({action:"resolution",resolution:{mode:"selected",pane_ids:[...panel.querySelectorAll("[data-resolution-unit]:checked")].map(input=>input.dataset.resolutionUnit),layers:[]}});runtime.closeConnectionResolution();return true}
      return true
    }
    runtime.closeConnectionResolution();return onClick(event)
  }
  const onKey=runtime.onKey
  runtime.onKey=event=>{if(event.target.closest?.(".connection-resolution-panel")){if(event.key==="Escape"){runtime.closeConnectionResolution();root.querySelector("[data-connection-resolution]")?.focus();event.preventDefault()}return}return onKey(event)}
}

function corpusRouteKey(node){return (node.source_pane||'')+'\0'+node.id}
function corpusRouteNodes(reference){return [reference,...Object.values(reference?.route_layers||{}).flatMap(arr)].filter(node=>node?.id)}
function corpusRouteResolved(node){return !node.unresolved&&node.resolved!==false}
function corpusRouteOrderedInputs(runtime){
  const inputs=corpusReadingRows(runtime)
  if(!runtime.data.reference)return inputs
  const nodes=[...runtime.corpusRoutes?.values()||[runtime.data.reference]].flatMap(corpusRouteNodes).filter(corpusRouteResolved)
  const connected=input=>nodes.some(node=>input.corpusVariants.some(pane=>pane.id===node.source_pane)||node.work_id===memberId(input))
  return [...inputs.filter(connected),...inputs.filter(input=>!connected(input))]
}
function corpusRouteSources(runtime){
  const inputs=corpusRouteOrderedInputs(runtime),rank=node=>{
    const index=inputs.findIndex(input=>memberId(input)===node.work_id||input.corpusVariants.some(pane=>pane.id===node.source_pane))
    return index<0?inputs.length:index
  }
  return corpusRouteNodes(runtime.data.reference).filter(node=>corpusRouteKey(node)!==corpusRouteKey(runtime.data.reference)&&corpusRouteResolved(node)).sort((a,b)=>rank(a)-rank(b))
}
function prepareCorpusRoutes(runtime){
  const reference=runtime.data.reference
  if(!reference){if(runtime.corpusBeforeRouteScroll!==undefined){runtime.state.corpusScroll=runtime.corpusBeforeRouteScroll;delete runtime.corpusBeforeRouteScroll}runtime.corpusRouteHistory={entries:[],index:-1};runtime.corpusRoutes=new Map();runtime.corpusRouteKey='';runtime.corpusRoutePending=null;runtime.corpusRoutePositioned=new Set();return}
  if(!runtime.corpusRoutes?.size&&runtime.corpusBeforeRouteScroll===undefined)runtime.corpusBeforeRouteScroll=runtime.state.corpusScroll||0
  runtime.corpusRoutes=runtime.corpusRoutes||new Map()
  const key=corpusRouteKey(reference),changed=runtime.corpusRouteKey!==key
  const history=runtime.corpusRouteHistory||(runtime.corpusRouteHistory={entries:[],index:-1})
  const visit={id:reference.id,source_pane:reference.source_pane||'',work_id:reference.work_id||'',corpus_depths:{...corpusBookDepths(runtime)}}
  if(history.entries[history.index]&&corpusRouteKey(history.entries[history.index])===key)history.entries[history.index]=visit
  else{history.entries=[...history.entries.slice(0,history.index+1),visit].slice(-100);history.index=history.entries.length-1}
  // Starting from a corpus is a fresh book-boundary route. Previously opened
  // chapter routes must not spill back into the vertical list of whole books.
  if(changed&&reference.layer==='CB')runtime.corpusRoutes.clear()
  runtime.corpusRouteKey=key;runtime.corpusRoutes.set(key,reference)
  const inputs=corpusReadingRows(runtime)
  for(const node of corpusRouteNodes(reference)){
    const input=inputs.find(input=>node.source_pane?input.corpusVariants.some(p=>p.id===node.source_pane):corpusRouteResolved(node)&&memberId(input)===node.work_id)
    if(input){runtime.state.corpusOpen[memberId(input)]=true;if(node.source_pane){runtime.state.corpusEditions=runtime.state.corpusEditions||{};runtime.state.corpusEditions[memberId(input)]=node.source_pane}}
  }
  if(changed){runtime.corpusRoutePositioned=new Set();runtime.corpusSourceIndex=0;runtime.corpusRoutePending=corpusRouteSources(runtime)[0]||reference}
}
function corpusRouteHistoryFlags(runtime){
  const history=runtime.corpusRouteHistory
  return {can_back:!!history&&history.index>0,can_forward:!!history&&history.index<history.entries.length-1}
}
function navigateCorpusRouteHistory(runtime,direction){
  if(![-1,1].includes(direction))return false
  const history=runtime.corpusRouteHistory,next=history&&history.index+direction,visit=history?.entries[next]
  if(!visit)return false
  history.index=next
  runtime.emit?.({type:'open_reference',reference_id:visit.id,source_pane:visit.source_pane,work_id:visit.work_id,corpus_depths:visit.corpus_depths})
  return true
}
function corpusRouteAdditionalPanes(runtime){
  const represented=new Set([...corpusInputs(runtime).map(input=>input.corpusOrigin.id),corpusOutput(runtime)?.id])
  const panes=new Map(allFieldPanes(runtime).map(pane=>[pane.id,pane])),extras=new Map()
  for(const ref of runtime.corpusRoutes?.values()||[]){
    for(const pane of arr(ref.resolution_panes))panes.set(pane.id,pane)
    for(const node of corpusRouteNodes(ref)){
      if(!node.source_pane||represented.has(node.source_pane)||!corpusRouteResolved(node))continue
      const pane=panes.get(node.source_pane)
      if(pane&&!pane.overview_metadata_only)extras.set(pane.id,pane)
    }
  }
  const saved=runtime.data.field.saved_focus?.source_pane||runtime.data.field.saved_reading_pane,pane=panes.get(saved)
  if(pane&&!pane.overview_metadata_only&&!represented.has(saved))extras.set(saved,pane)
  return [...extras.values()]
}
function corpusRouteExtraPanes(runtime){return corpusRouteAdditionalPanes(runtime).filter(pane=>['WB','CB'].includes(pane.layer)||pane.id===(runtime.data.field.saved_focus?.source_pane||runtime.data.field.saved_reading_pane))}
function corpusRouteBookPanes(runtime,member){
  const work=memberId(member),nodes=[...runtime.corpusRoutes?.values()||[]].flatMap(corpusRouteNodes)
  const standalone=new Set(corpusRouteExtraPanes(runtime).map(pane=>pane.id))
  return corpusRouteAdditionalPanes(runtime).filter(pane=>!standalone.has(pane.id)&&['SOURCE','CH','CL','MC'].includes(pane.layer)&&(pane.work_id===work||nodes.some(node=>node.source_pane===pane.id&&node.work_id===work)))
}
function corpusRouteExtrasHTML(runtime){return corpusRouteExtraPanes(runtime).map(pane=>`<article class="ct-row" data-corpus-route-row="${esc(pane.id)}"><div class="ct-native-book ct-route-extra" data-native-route="${esc(pane.id)}" aria-label="${esc(pane.title)} route reading"></div></article>`).join('')}
function corpusRouteCards(runtime){
  const cards=new Map()
  for(const host of runtime.root.querySelectorAll('[data-native-deep],[data-native-input],[data-native-corpus],[data-native-route]')){
    const native=host.shadowRoot&&CORPUS_BOOK_READER.runtime(host.shadowRoot);if(!native)continue
    for(const card of native.root.querySelectorAll('[data-select-axiom],[data-select-passage]')){
      const id=card.dataset.selectAxiom||card.dataset.selectPassage,scope=card.closest('[data-connection-source-pane]')?.dataset.connectionSourcePane||card.closest('[data-connection-field]')?.dataset.connectionField||native.data.viewer_scopes?.[id]||'',key=scope+'\0'+id
      if(!cards.has(key))cards.set(key,{card,host,native,pane:card.closest('[data-pane]')})
    }
  }
  return cards
}
function focusCorpusRouteReadings(runtime,cards,keys){
  const memory=runtime.corpusRouteReadingMemory||(runtime.corpusRouteReadingMemory=new Map()),panes=new Map()
  for(const [key,entry] of cards){if(!panes.has(entry.pane))panes.set(entry.pane,{...entry,matches:new Set()});if(keys.has(key))panes.get(entry.pane).matches.add(entry.card)}
  for(const [pane,{native,matches}] of panes){
    const body=pane?.querySelector?.('.window-body');if(!body)continue
    const identity=native.data.workspace_context+'|'+pane.dataset.pane,sections=[...body.querySelectorAll('.care-section')]
    const active=Boolean(runtime.data.reference&&matches.size),signature=[...matches].map(card=>card.dataset.selectAxiom||card.dataset.selectPassage).join('|')
    if(active&&!memory.has(identity))memory.set(identity,{top:body.scrollTop,sections:sections.map(section=>section.open)})
    const changed=body.dataset.corpusRouteReading!==signature
    for(const [index,section] of sections.entries()){
      const rows=[...section.querySelectorAll('.axiom-row')],connected=active&&rows.some(row=>matches.has(row.querySelector('[data-select-axiom]')))
      // Match ordinary CARE: reveal the selected section without hiding other
      // axioms or adding a corpus-only context toggle or colour treatment.
      section.classList.toggle('corpus-route-section',false)
      for(const row of rows)row.classList.toggle('corpus-route-quiet',false)
      section.querySelector('[data-corpus-route-context]')?.remove()
      section.removeAttribute('data-corpus-show-context')
      if(active&&changed&&connected)section.open=true
      if(!active&&memory.has(identity))section.open=memory.get(identity).sections[index]??section.open
    }
    if(active)body.dataset.corpusRouteReading=signature
    else{delete body.dataset.corpusRouteReading;if(memory.has(identity)){body.scrollTop=memory.get(identity).top;memory.delete(identity)}}
  }
}
function positionCorpusRouteCard({card,pane,native}){
  if(!pane||pane.hidden||pane.classList.contains('corpus-pane-title-folded')||pane.classList.contains('care-pane-minimized'))return false
  for(let el=card.parentElement;el&&el!==native.root;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true
  const body=card.closest('.window-body'),rect=body?.getBoundingClientRect()
  if(!body||!rect?.height)return false
  // DOM rectangles include the Library fit zoom; scrollTop uses unscaled pixels.
  const scale=body.clientHeight?rect.height/body.clientHeight:1
  const cardRect=card.getBoundingClientRect(),height=Math.min(cardRect.height,rect.height*.8)
  body.scrollTop+=(cardRect.top+height/2-rect.top-rect.height/2)/scale
  return true
}
function revealCorpusRouteHost(runtime,host){
  if(!runtime.data.reference)return
  const keys=new Set([...runtime.corpusRoutes?.values()||[]].flatMap(corpusRouteNodes).filter(corpusRouteResolved).map(corpusRouteKey)),panes=new Set()
  const positioned=runtime.corpusRoutePositioned||(runtime.corpusRoutePositioned=new Set())
  for(const [key,entry] of corpusRouteCards(runtime))if(entry.host===host&&keys.has(key)&&!panes.has(entry.pane)&&positionCorpusRouteCard(entry)){
    panes.add(entry.pane);positioned.add(key);positioned.add(entry.native.data.workspace_context+'|'+entry.pane.dataset.pane)
  }
  drawCorpusRouteThreads(runtime)
}
function queueCorpusFoldRouteLayout(runtime,host,restored=false){
  const pending=runtime.corpusFoldRouteLayouts||(runtime.corpusFoldRouteLayouts=new Map()),previous=pending.get(host),reference=runtime.data.reference
  const key=reference&&corpusRouteKey(reference),folded=()=>Boolean(host.hasAttribute?.('data-corpus-fold-compact'))
  if(previous&&previous.key===key&&!previous.settled){previous.restore=folded()?false:previous.restore||restored;return}
  previous?.cancel()
  if(!reference){drawCorpusRouteThreads(runtime);return}
  if(!runtime.view.requestAnimationFrame){if(restored&&!folded())revealCorpusRouteHost(runtime,host);else drawCorpusRouteThreads(runtime);return}
  const entry={key,restore:restored&&!folded(),settled:false,frame:null}
  const interacting=()=>{entry.restore=false},events=['wheel','touchstart','pointerdown','keydown']
  const cancel=()=>{
    if(entry.frame!==null)runtime.view.cancelAnimationFrame?.(entry.frame)
    for(const type of events)host.shadowRoot?.removeEventListener?.(type,interacting,true)
    if(pending.get(host)===entry)pending.delete(host)
  }
  entry.cancel=cancel;pending.set(host,entry)
  for(const type of events)host.shadowRoot?.addEventListener?.(type,interacting,{capture:true,passive:true})
  const valid=()=>pending.get(host)===entry&&runtime.root.isConnected!==false&&host.isConnected!==false&&runtime.data.reference&&corpusRouteKey(runtime.data.reference)===key
  // Native zoom and its first resize can complete after the red control's
  // synchronous layout callback. Centre once, then take a final geometry sample.
  entry.frame=runtime.view.requestAnimationFrame(()=>{
    entry.frame=runtime.view.requestAnimationFrame(()=>{
      if(!valid()){cancel();return}
      entry.settled=true
      if(entry.restore&&!folded())revealCorpusRouteHost(runtime,host);else drawCorpusRouteThreads(runtime)
      entry.frame=runtime.view.requestAnimationFrame(()=>{const redraw=valid();cancel();if(redraw)drawCorpusRouteThreads(runtime)})
    })
  })
}
function focusCorpusRouteNode(runtime,node){
  if(!node||!corpusRouteResolved(node))return false
  const match=corpusRouteCards(runtime).get(corpusRouteKey(node));if(!match)return false
  const {card,host,native,pane}=match,viewport=runtime.root.querySelector('[data-corpus-viewport]')
  if(pane?.classList.contains('care-pane-minimized'))pane.querySelector('[data-pane-control="minimize"]')?.click()
  if(pane?.classList.contains('corpus-pane-title-folded')){
    if(native.corpusPaneFolds?.setFolded)native.corpusPaneFolds.setFolded(pane.dataset.pane,false)
    else (pane.querySelector('[data-corpus-pane-fold]')||pane.querySelector('[data-pane-control="minimize"]'))?.click()
  }
  for(let el=card.parentElement;el&&el!==native.root;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true
  runtime.corpusRouteNavigating=true
  try{native.focus(pane?.dataset.pane)}finally{runtime.corpusRouteNavigating=false}
  positionCorpusRouteCard(match)
  if(viewport&&!host.hasAttribute('data-native-corpus'))viewport.scrollTop+=host.getBoundingClientRect().top-viewport.getBoundingClientRect().top-corpusViewportInset(runtime,viewport)
  updateCorpusToolbar(runtime);drawCorpusRouteThreads(runtime);save(runtime);return true
}
function installCorpusRouteControls(runtime,host,native){
  if(host.hasAttribute('data-native-corpus')&&!host.hasAttribute('data-native-corpus-build'))return
  const toolbar=native.root.querySelector('[data-reader-menu-panel="navigate"]'),bar=native.root.querySelector('.desk-toolbar')
  toolbar?.querySelector('[data-corpus-route-tools]')?.remove()
  bar?.querySelector('[data-corpus-route-toolbar]')?.remove()
  if(!runtime.data.reference)return
  const sources=corpusRouteSources(runtime)
  const missing=Number(runtime.data.reference.unresolved_reference_count||0)
  const action=event=>{
    const button=event.target.closest('button');if(!button)return
    if(button.disabled)return
    event.preventDefault();event.stopPropagation()
    native.closeReaderMenu?.({restoreFocus:true})
    if(button.hasAttribute('data-corpus-route-close')){runtime.corpusRouteKey='';runtime.emit?.({type:'clear_reference'});return}
    if(sources.length){runtime.corpusSourceIndex=((runtime.corpusSourceIndex??-1)+Number(button.dataset.corpusSourceStep)+sources.length)%sources.length;const node=sources[runtime.corpusSourceIndex];runtime.corpusRoutePending=node;if(focusCorpusRouteNode(runtime,node))runtime.corpusRoutePending=null;else requestCorpusMembers(runtime,[node.work_id],runtime.emit)}
  }
  if(toolbar){
    toolbar.insertAdjacentHTML('beforeend',`<div class="corpus-route-tools" data-corpus-route-tools><div class="desk-menu-rule"></div><span class="desk-menu-heading">Route sources · ${sources.length}</span><button type="button" class="desk-tab" data-corpus-source-step="-1" aria-label="Previous route source"${sources.length?'':' disabled'}><span aria-hidden="true">↑</span><span>Previous source</span></button><button type="button" class="desk-tab" data-corpus-source-step="1" aria-label="Next route source"${sources.length?'':' disabled'}><span aria-hidden="true">↓</span><span>Next source</span></button><button type="button" class="desk-tab" data-corpus-route-close><span aria-hidden="true">×</span><span>Close route</span></button>${missing?`<small>${missing} unavailable</small>`:''}</div>`)
    toolbar.querySelector('[data-corpus-route-tools]').onclick=action
  }
  if(bar&&!host.hasAttribute('data-native-corpus-build')){
    // Reuse the Library's route strip and button styles. Corpus arrows move
    // through its vertically stacked exact sources, keeping their own labels.
    const arrow=(step,label,path)=>`<button type="button" class="route-history-arrow" data-corpus-source-step="${step}" aria-label="${label}" title="${label}"${sources.length?'':' disabled'}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="${path}"/></svg></button>`
    const label=`ROUTE · ${sources.length} source${sources.length===1?'':'s'}${missing?' · '+missing+' unavailable':''}`
    const html=`<div class="route-toolbar" data-corpus-route-toolbar><span>${label}</span><div class="route-history-actions" role="group" aria-label="Corpus route navigation">${arrow(-1,'Previous route source','M10 16V4m-6 6 6-6 6 6')}${arrow(1,'Next route source','M10 4v12m-6-6 6 6 6-6')}<button type="button" class="route-close" data-corpus-route-close title="Close route and return to reading"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg><span>Close route</span></button></div></div>`
    const title=bar.querySelector('.desk-title')
    if(title)title.insertAdjacentHTML('beforebegin',html);else bar.insertAdjacentHTML('beforeend',html)
    bar.querySelector('[data-corpus-route-toolbar]').onclick=action
  }
}
function decorateCorpusRoutes(runtime){
  const cards=corpusRouteCards(runtime),reference=runtime.data.reference,keys=new Set(),selected=reference&&corpusRouteKey(reference)
  for(const ref of runtime.corpusRoutes?.values()||[])for(const node of corpusRouteNodes(ref))if(corpusRouteResolved(node))keys.add(corpusRouteKey(node))
  focusCorpusRouteReadings(runtime,cards,keys)
  const positioned=runtime.corpusRoutePositioned||(runtime.corpusRoutePositioned=new Set())
  for(const [key,{card,pane,native}] of cards){
    card.classList.toggle('corpus-route-match',keys.has(key));card.classList.toggle('corpus-route-selected',key===selected)
    if(keys.has(key)&&!positioned.has(key)){
      const unitKey=native.data.workspace_context+'|'+pane?.dataset.pane
      if(positioned.has(unitKey)){positioned.add(key);continue}
      if(positionCorpusRouteCard({card,pane,native})){positioned.add(unitKey);positioned.add(key)}
    }
  }
  if(runtime.corpusRoutePending&&focusCorpusRouteNode(runtime,runtime.corpusRoutePending))runtime.corpusRoutePending=null
  const works=corpusRouteNodes(reference).filter(corpusRouteResolved).map(node=>node.work_id).filter(Boolean)
  if(!runtime.root.querySelector('[data-native-corpus-build]'))requestCorpusMembers(runtime,works,runtime.emit)
  drawCorpusRouteThreads(runtime)
}
function queueCorpusRouteLayout(runtime){
  if(!runtime.view.requestAnimationFrame){decorateCorpusRoutes(runtime);return}
  if(runtime.corpusRouteLayoutFrame)runtime.view.cancelAnimationFrame(runtime.corpusRouteLayoutFrame)
  // Native Library readers restore their saved positions on their first resize.
  // Position this route once that initial layout has completed, not underneath it.
  runtime.corpusRouteLayoutFrame=runtime.view.requestAnimationFrame(()=>{
    runtime.corpusRouteLayoutFrame=runtime.view.requestAnimationFrame(()=>{
      runtime.corpusRouteLayoutFrame=null
      if(runtime.root.isConnected)decorateCorpusRoutes(runtime)
    })
  })
}
function drawCorpusRouteThreads(runtime){
  let svg=runtime.root.querySelector('[data-corpus-route-threads]')
  // The shared build uses the ordinary reader's scoped route threads. The
  // outer overlay is only needed across independently expanded book hosts.
  if(runtime.root.querySelector('[data-native-corpus-build]')){svg?.remove();return}
  if(!runtime.data.reference){svg?.remove();return}
  const viewport=runtime.root.querySelector('[data-corpus-viewport]');if(!viewport)return
  const rootBox=runtime.root.getBoundingClientRect(),clip=viewport.getBoundingClientRect(),cards=corpusRouteCards(runtime),paths=[],seen=new Set(),drawable=[]
  const anchor=(entry,right)=>{
    const pane=entry.pane.getBoundingClientRect(),folded=entry.pane.classList.contains('corpus-pane-title-folded')||entry.pane.classList.contains('care-pane-minimized'),rect=folded?pane:entry.card.getBoundingClientRect(),body=folded?pane:entry.card.closest('.window-body')?.getBoundingClientRect()||pane,host=entry.host.getBoundingClientRect()
    const low=Math.max(clip.top+5,Math.min(clip.bottom-5,body.top+5)),high=Math.max(low,Math.min(clip.bottom-5,body.bottom-5))
    const x=Math.max(host.left+3,Math.min(host.right-3,right?rect.right:rect.left))
    return {x:x-rootBox.left,y:Math.max(low,Math.min(high,rect.top+rect.height/2))-rootBox.top}
  }
  for(const ref of runtime.corpusRoutes?.values()||[])for(const edge of arr(ref.route_edges)){
    const from=(edge.source_pane||edge.from_pane||'')+'\0'+(edge.source_id||edge.from),to=(edge.target_pane||edge.to_pane||'')+'\0'+(edge.target_id||edge.to),key=from+'|'+to
    const resolved=new Set(corpusRouteNodes(ref).filter(corpusRouteResolved).map(corpusRouteKey))
    if(!resolved.has(from)||!resolved.has(to)||seen.has(key)||!cards.has(from)||!cards.has(to))continue;seen.add(key)
    const a=cards.get(from),b=cards.get(to)
    if(a.pane.hidden||b.pane.hidden||!a.pane.getBoundingClientRect().width||!b.pane.getBoundingClientRect().width)continue
    const forward=a.pane.getBoundingClientRect().left<=b.pane.getBoundingClientRect().left,p=anchor(a,forward),q=anchor(b,!forward),same=a.pane===b.pane,bend=same?22:Math.max(12,Math.abs(q.x-p.x)*.4)
    const expanded=entry=>{
      if(entry.pane.classList.contains('corpus-pane-title-folded')||entry.pane.classList.contains('care-pane-minimized')||entry.card.closest('details:not([open])'))return false
      const rect=entry.card.getBoundingClientRect(),host=entry.host.getBoundingClientRect(),body=entry.card.closest('.window-body')?.getBoundingClientRect()||entry.pane.getBoundingClientRect()
      // Continuation anchors keep offscreen evidence visible, but cannot
      // replace a direct trace with a chain through an offscreen feeder.
      return rect.width>0&&rect.height>0&&rect.right>Math.max(clip.left,host.left)&&rect.left<Math.min(clip.right,host.right)&&rect.bottom>Math.max(clip.top,body.top)+8&&rect.top<Math.min(clip.bottom,body.bottom)-8
    }
    const identity=(entry,key)=>JSON.stringify([entry.native.data.workspace_context,entry.pane.dataset.pane,key])
    drawable.push({source_id:identity(a,from),target_id:identity(b,to),p,q,same,bend,forward,expanded:expanded(a)&&expanded(b)})
  }
  // Folded sheets retain their existing title anchors, but those anchors do
  // not stand in for a visible chain through an exact feeder axiom.
  const reduced=new Set(CORPUS_BOOK_READER.displayRouteEdges(drawable.filter(edge=>edge.expanded),runtime.connectionView))
  for(const {p,q,same,bend,forward} of drawable.filter(edge=>!edge.expanded||reduced.has(edge))){
    paths.push(`<path d="M${p.x},${p.y} C${same?p.x+bend:p.x+(forward?bend:-bend)},${p.y} ${same?q.x+bend:q.x-(forward?bend:-bend)},${q.y} ${q.x},${q.y}"/><circle cx="${p.x}" cy="${p.y}" r="2.5"/><circle cx="${q.x}" cy="${q.y}" r="2.5"/>`)
  }
  if(!svg){svg=runtime.root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('data-corpus-route-threads','');svg.setAttribute('aria-hidden','true');runtime.root.append(svg)}
  svg.setAttribute('viewBox',`0 0 ${rootBox.width} ${rootBox.height}`);svg.innerHTML=paths.join('')
}

function installCorpusPaneFolds(runtime,host,native,onLayout=()=>{}){
  if(!host||!native?.root)return {refresh(){},cleanup(){}}
  native.corpusPaneFolds?.cleanup()
  const root=native.root,states=runtime.state.corpusPaneFolds||(runtime.state.corpusPaneFolds={})
  const context=String(native.data?.workspace_context||native.data?.stack?.work?.id||'corpus')
  const installed=new Map(),foldable=new Set(['SOURCE','CH','CL','MC','WB','CB'])
  let stopped=false
  const measure=()=>{
    const panes=[...root.querySelectorAll('.desk-window[data-pane]')].filter(pane=>!pane.hidden&&!pane.closest('[hidden]'))
    const folded=panes.filter(pane=>pane.classList.contains('corpus-pane-title-folded'))
    const detail={allFolded:panes.length>0&&folded.length===panes.length,visibleCount:panes.length,foldedCount:folded.length,titleHeight:Math.max(44,...folded.map(pane=>Number(pane.dataset.corpusFoldTitleHeight)||44))}
    root.classList.toggle('corpus-titles-compact',detail.allFolded)
    host.toggleAttribute('data-corpus-all-panes-folded',detail.allFolded);onLayout(host,detail)
    return detail
  }
  const attach=pane=>{
    const layer=String(pane.dataset.layer||'').toUpperCase(),key=context+'|'+pane.dataset.pane
    if(!foldable.has(layer))return
    const bar=pane.querySelector(':scope > .window-titlebar'),controls=bar?.querySelector('.care-pane-controls')
    if(!bar||!controls)return
    // Reuse the existing red control and remove the earlier extra gold dot
    // from retained reader DOM. Native Library/Laterals never install this.
    controls.querySelector('[data-corpus-pane-fold]')?.remove()
    const button=controls.querySelector('[data-pane-control="minimize"]')
    if(!button)return
    const nativeKey=String(native.data?.stack?.work?.id||'')+'|'+pane.dataset.pane,nativeState=native.paneControlState?.[nativeKey]
    if(!(key in states))states[key]=Boolean(nativeState?.minimized||pane.classList.contains('care-pane-minimized')||(runtime.state.corpusBooksFolded===true&&!host.hasAttribute?.('data-native-corpus')))
    // Earlier corpus sessions may contain the native vertical-rail state.
    // Transfer it once, then keep the native state clear for section repaints.
    if(nativeState)nativeState.minimized=false
    pane.classList.toggle('care-pane-minimized',false)
    const name=bar.querySelector('strong')?.textContent?.trim()||'pane'
    const paint=()=>{
      const folded=Boolean(states[key])
      // Offset dimensions are independent of the reader's horizontal fit zoom.
      if(!pane.classList.contains('corpus-pane-title-folded')){
        const borders=Math.max(0,Number(pane.offsetHeight||0)-Number(pane.clientHeight||0))
        const height=Math.max(36,Number(bar.offsetHeight)||42)+borders
        pane.dataset.corpusFoldTitleHeight=String(height)
        pane.style.setProperty('--corpus-folded-title-height',height+'px')
      }
      pane.classList.toggle('corpus-pane-title-folded',folded)
      const label=(folded?'Restore ':'Minimise ')+name+(folded?' reading':' to its title strip')
      button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(folded));button.disabled=false
      const glyph=folded?'M2 6h8M6 2v8':'M2 6h8'
      button.innerHTML=`<svg viewBox="0 0 12 12" aria-hidden="true"><path d="${glyph}"/></svg>`
    }
    const previous=installed.get(controls)
    if(previous&&controls.onclick===previous.wrapped)controls.onclick=previous.original
    const original=controls.onclick
    const wrapped=event=>{
      const action=event.target.closest('[data-pane-control]')?.dataset.paneControl
      if(action==='minimize'){
        event.preventDefault();event.stopPropagation();states[key]=!states[key]
        native.queueTrackZoom?.();native.queueThreads?.()
      }else original?.call(controls,event)
      paint();measure()
    }
    controls.onclick=wrapped
    installed.set(controls,{original,wrapped,button,paint})
    paint()
  }
  const setFolded=(panes,value)=>{
    if(stopped)return null
    for(const pane of panes)if(foldable.has(String(pane.dataset.layer||'').toUpperCase()))states[context+'|'+pane.dataset.pane]=Boolean(value)
    const detail=controller.refresh()
    native.queueTrackZoom?.();native.queueThreads?.()
    return detail
  }
  const controller={
    refresh(){
      if(stopped)return null
      for(const pane of root.querySelectorAll('.desk-window[data-pane]'))attach(pane)
      return measure()
    },
    setFolded(paneId,value){return setFolded([...root.querySelectorAll('.desk-window[data-pane]')].filter(pane=>pane.dataset.pane===paneId),value)},
    setAll(value){return setFolded([...root.querySelectorAll('.desk-window[data-pane]')],value)},
    cleanup(){
      if(stopped)return
      stopped=true
      for(const [controls,entry] of installed)if(controls.onclick===entry.wrapped)controls.onclick=entry.original
      installed.clear()
      if(native.corpusPaneFolds===controller)delete native.corpusPaneFolds
    },
  }
  native.corpusPaneFolds=controller
  controller.refresh()
  return controller
}

function lateralReaderTab(id,title,layer=''){
  const label=layer==='WB'?'WB · '+String(title).replace(/^WB\s*[·/]\s*/, ''):String(title).replace(/^([A-Z]+)\s*\/\s*/, '$1 · ')
  return `<button type="button" class="desk-tab" data-jump="${esc(id)}" title="${esc(title)}" aria-label="Go to ${esc(title)}">${esc(label)}</button>`
}
function lateralLayerMenu(runtime,entries){
  const s=runtime.state,members=arr(runtime.data.field.members)
  if(runtime.data.reference)return lateralRouteLayerMenu(runtime,entries)
  const books=members.map((member,index)=>{
    const id=memberId(member),stack=runtime.data.stacks?.[id],available=availableLayers(member,stack),selected=selectedLayers(s,member,stack)
    const depth=[...available].reverse().find(layer=>JSON.stringify(available.filter(value=>LAYERS.indexOf(value)>=LAYERS.indexOf(layer)))===JSON.stringify(selected))||'custom'
    return `<div class="lateral-layer-group"><strong>${esc(members.length===2?(index===0?'Left · ':'Right · '):'')}${esc(member.title)}</strong>${memberOrigin(runtime,member)?'<small>Saved WB · lower layers explore the Library book</small>':''}<label class="lateral-layer-depth"><span>Layers shown</span><select data-lateral-depth="${esc(id)}" aria-label="${esc(member.title)} layers shown"><option value="custom" disabled ${depth==='custom'?'selected':''}>Custom layers</option>${[...available].reverse().map(layer=>`<option value="${layer}" ${depth===layer?'selected':''}>${layer===available.at(-1)?layer:layer+' → '+available.at(-1)}</option>`).join('')}</select></label><div class="lateral-layer-options" role="group" aria-label="${esc(member.title)} layers">${available.map(layer=>`<button type="button" class="desk-tab ${selected.includes(layer)?'active':''}" data-layer="${layer}" data-work="${esc(id)}" style="--layer-color:${color(layer)}" aria-pressed="${selected.includes(layer)}" aria-label="${esc(member.title)} · ${layer==='SOURCE'?'Source':layer}">${layer==='SOURCE'?'Source':layer}</button>`).join('')}<button type="button" class="desk-tab" data-all-layers="${esc(id)}">All layers</button><button type="button" class="desk-tab" data-book-fold="${esc(id)}">${s.books[id]?'Restore':'Fold'} book</button></div></div>`
  }).join('')
  if(entries===null)return books.replace(/<div class="lateral-layer-options"[\s\S]*?<\/div>/g,'')
  return `${books}<span class="desk-menu-heading">Open readings</span><nav data-lateral-tabs aria-label="Reading panes">${entries.map(item=>lateralReaderTab(item.id,item.title,item.layer)).join('')}</nav>`
}
function lateralResolutionReference(runtime){
  if(runtime.data.reference)return runtime.data.reference
  const units=arr(runtime.data.field.members).flatMap(member=>availableLayers(member,runtime.data.stacks?.[memberId(member)]).map(layer=>({id:memberId(member)+'|'+layer,layer,work_id:memberId(member),work_title:member.title,title:layer,unit_id:''})))
  const pane_ids=units.filter(unit=>selectedLayers(runtime.state,arr(runtime.data.field.members).find(member=>memberId(member)===unit.work_id),runtime.data.stacks?.[unit.work_id]).includes(unit.layer)).map(unit=>unit.id)
  const chosenLayers=[...new Set(units.filter(unit=>pane_ids.includes(unit.id)).map(unit=>unit.layer))],uniform=units.every(unit=>pane_ids.includes(unit.id)===chosenLayers.includes(unit.layer))
  return {resolution_choices:{units},resolution:{mode:'selected',layers:uniform?chosenLayers:[],pane_ids:uniform?[]:pane_ids},route_layers:{}}
}
function applyLateralResolution(runtime,resolution){
  if(runtime.data.reference){runtime.emit?.({type:'resolution',resolution});return}
  for(const member of arr(runtime.data.field.members)){
    const id=memberId(member),stack=runtime.data.stacks?.[id],available=availableLayers(member,stack)
    const selected=available.filter(layer=>resolution.mode==='full'||(resolution.mode==='immediate'?layer===available.at(-1):arr(resolution.layers).includes(layer)||arr(resolution.pane_ids).includes(id+'|'+layer)))
    runtime.state.layers[id]=selected;runtime.state.books[id]=!selected.length;restoreLateralLayers(runtime,id,selected)
    if(selected.length&&!stack)runtime.emit?.({type:'load_member',work_id:id})
  }
}
function lateralRouteSelection(reference){
  const units=arr(reference?.resolution_choices?.units),resolution=reference?.resolution||{},visible=new Set(Object.values(reference?.route_layers||{}).flatMap(arr).map(item=>item.source_pane))
  return units.filter(unit=>resolution.mode==='full'||arr(resolution.pane_ids).includes(unit.id)||arr(resolution.layers).includes(unit.layer)||(resolution.mode!=='selected'&&visible.has(unit.id))).map(unit=>unit.id)
}
function lateralRouteLayerMenu(runtime,entries){
  const reference=runtime.data.reference,units=arr(reference.resolution_choices?.units),selected=new Set(lateralRouteSelection(reference))
  const books=arr(runtime.data.field.members).map(member=>{
    const id=memberId(member),own=units.filter(unit=>unit.work_id===id&&LAYERS.includes(unit.layer)),available=LAYERS.filter(layer=>own.some(unit=>unit.layer===layer))
    if(!own.length)return ''
    const depth=[...available].reverse().find(layer=>own.every(unit=>selected.has(unit.id)===(LAYERS.indexOf(unit.layer)>=LAYERS.indexOf(layer))))||'custom'
    return `<div class="lateral-layer-group"><strong>${esc(member.title)}</strong><small>Saved readings feeding this route</small><label class="lateral-layer-depth"><span>Through</span><select data-lateral-route-depth="${esc(id)}" aria-label="${esc(member.title)} route depth"><option value="custom" disabled ${depth==='custom'?'selected':''}>Selected readings</option>${[...available].reverse().map(layer=>`<option value="${layer}" ${depth===layer?'selected':''}>${layer==='SOURCE'?'Source':layer}</option>`).join('')}</select></label></div>`
  }).join('')
  if(entries===null)return books
  return `${books}<button type="button" class="desk-tab" data-connection-resolution>Choose route layers & readings…</button><div class="desk-menu-rule"></div><span class="desk-menu-heading">Open route panes</span><nav data-lateral-tabs aria-label="Reading panes">${entries.map(item=>lateralReaderTab(item.id,item.title,item.layer)).join('')}</nav>`
}
function setLateralRouteDepth(runtime,id,layer){
  const reference=runtime.data.reference,units=arr(reference?.resolution_choices?.units),own=units.filter(unit=>unit.work_id===id&&LAYERS.includes(unit.layer))
  if(!LAYERS.includes(layer)||!own.some(unit=>unit.layer===layer))return false
  const selected=new Set(lateralRouteSelection(reference))
  own.forEach(unit=>{if(LAYERS.indexOf(unit.layer)>=LAYERS.indexOf(layer))selected.add(unit.id);else selected.delete(unit.id)})
  runtime.emit?.({type:'resolution',resolution:{mode:'selected',layers:[],pane_ids:[...selected]}})
  return true
}
function setLateralDepth(runtime,id,layer){
  const member=arr(runtime.data.field.members).find(member=>memberId(member)===id)
  if(!member||!LAYERS.includes(layer))return false
  const stack=runtime.data.stacks?.[id],available=availableLayers(member,stack)
  if(!available.includes(layer))return false
  runtime.state.layers[id]=available.filter(value=>LAYERS.indexOf(value)>=LAYERS.indexOf(layer));runtime.state.books[id]=false
  restoreLateralLayers(runtime,id,runtime.state.layers[id])
  if(!stack)runtime.emit?.({type:'load_member',work_id:id})
  return true
}
function restoreLateralLayers(runtime,id,layers){
  const member=arr(runtime.data.field.members).find(member=>memberId(member)===id);if(!member)return
  const prefixes=layers.map(layer=>`book:${id}:${layer}`),origins=layers.includes('WB')?memberOrigins(runtime,member).map(pane=>'field:'+pane.id):[]
  const matches=key=>origins.includes(key)||prefixes.some(prefix=>key===prefix||key.startsWith(prefix+':'))
  for(const key of Object.keys(runtime.state.folded))if(matches(key))runtime.state.folded[key]=false
  const scope=runtime.data.field.id+'|'
  for(const [key,state] of Object.entries(runtime.paneControlState||{}))if(key.startsWith(scope)&&matches(key.slice(scope.length)))state.minimized=false
}
function lateralReaderHeader(runtime,entries){
  const {field}=runtime.data,s=runtime.state,members=arr(field.members)
  const file='<button type="button" class="desk-tab" data-library>Open library</button>'
  const navigate=`<button type="button" class="desk-tab" data-field-bookmarks aria-expanded="false">${CORPUS_BOOK_READER.bookmarkIcon()}<span>Bookmarks</span><span class="desk-submenu-arrow" aria-hidden="true">›</span></button><div class="lateral-bookmarks" data-field-bookmarks-list hidden>${fieldBookmarksMenu(runtime)}</div><div class="desk-menu-rule"></div><button type="button" class="desk-tab" data-reader-layers aria-haspopup="dialog" aria-expanded="false"><span>Open readings</span><span class="desk-submenu-arrow" aria-hidden="true">›</span></button>`
  const connections=`${connectionResolutionControl({connection:{reference:lateralResolutionReference(runtime),resolution:lateralResolutionReference(runtime).resolution}})}${runtime.data.reference?'<button type="button" class="desk-tab" data-close-route>Close route</button>':''}`
  const view=`<span class="desk-menu-heading">Reading panes</span><button type="button" class="desk-tab" data-books-fold="yes">Fold book panes</button><button type="button" class="desk-tab" data-books-fold="no">Restore book panes</button><button type="button" class="desk-tab" data-field-sections="collapse">Collapse sections in this pane</button><button type="button" class="desk-tab" data-field-sections="expand">Expand sections in this pane</button><div class="desk-menu-rule"></div>`+CORPUS_BOOK_READER.readerViewOptions({showZoom:false,showAppearance:false,showBeautifulText:false,shortcuts:'lateral'}).replace('data-text-size="-1"','data-scale="-.1"').replace('data-text-size="1"','data-scale=".1"')
  const tabs=`<nav data-lateral-tabs aria-label="Reading panes">${entries.map(item=>lateralReaderTab(item.id,item.title,item.layer)).join('')}</nav>`
  const route=runtime.data.reference?'<div class="lateral-route-toolbar" role="group" aria-label="Route controls"><span>ROUTE</span><button type="button" data-close-route><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>Close route</button></div>':''
  return `<header class="desk-toolbar desk-menu-toolbar lateral-reader-toolbar">${CORPUS_BOOK_READER.readerMenuBar({},tabs,{file,navigate,connections,view,showZoom:false,showAppearance:false,shortcuts:'lateral'})}${route}<div class="desk-title lateral-reader-title"><strong title="${esc(field.title)}">${esc(field.title)}</strong><span>${esc(field.description||field.author||'Read through to the source books')}</span></div></header>`
}
function lateralReaderFooter(runtime){return ''}
function rememberLateralReaderMenu(runtime){
  runtime.lateralMenuRestore=runtime.readerMenu?{id:runtime.readerMenu.button.dataset.readerMenu,layers:Boolean(runtime.readerLayers)}:null
  runtime.closeReaderMenu?.()
}
function restoreLateralReaderMenu(runtime){
  const saved=runtime.lateralMenuRestore;runtime.lateralMenuRestore=null
  if(!saved)return
  const button=runtime.root.querySelector(`[data-reader-menu="${saved.id}"]`)
  if(button){runtime.openReaderMenu?.(button);if(saved.layers){const anchor=runtime.root.querySelector('[data-reader-layers]');if(anchor)runtime.openReaderLayers?.(anchor)}}
}
function lateralVisiblePanes(runtime){return [...runtime.root.querySelectorAll('.field-strip > .field-pane[data-pane]')]}
function lateralNearestPane(runtime){
  const panes=lateralVisiblePanes(runtime),strip=runtime.root.querySelector('[data-strip]');if(!panes.length||!strip)return null
  const bounds=strip.getBoundingClientRect(),padding=parseFloat(runtime.view.getComputedStyle?.(strip)?.paddingLeft)||12,edge=bounds.left+padding
  // Library navigation aligns a reading's left edge. A wide viewer can show
  // two complete panes, so its centre would incorrectly select the next one.
  return panes.reduce((best,pane)=>Math.abs(pane.getBoundingClientRect().left-edge)<Math.abs(best.getBoundingClientRect().left-edge)?pane:best,panes[0])
}
function requestLateralPaneFocus(runtime,id){
  const strip=runtime.root.querySelector('[data-strip]'),pane=lateralVisiblePanes(runtime).find(pane=>pane.dataset.pane===id);if(!strip||!pane)return
  const rect=pane.getBoundingClientRect(),bounds=strip.getBoundingClientRect(),offset=runtime.data.reference?(strip.clientWidth-rect.width)/2:12
  runtime.lateralRequestedFocus={id,left:Math.max(0,Math.min(strip.scrollWidth-strip.clientWidth,strip.scrollLeft+rect.left-bounds.left-offset)),arrived:false}
}
function lateralFocusedPane(runtime){
  const requested=runtime.lateralRequestedFocus,strip=runtime.root.querySelector('[data-strip]')
  if(requested&&strip){
    const pane=lateralVisiblePanes(runtime).find(pane=>pane.dataset.pane===requested.id),arrived=Math.abs(strip.scrollLeft-requested.left)<2
    if(pane&&(!requested.arrived||arrived)){requested.arrived=arrived;return pane}
    runtime.lateralRequestedFocus=null
  }
  return lateralNearestPane(runtime)
}
function updateLateralReaderChrome(runtime,rebuild=false,focusedId=''){
  if(runtime.data.field.field!=='lateral')return
  const root=runtime.root,panes=lateralVisiblePanes(runtime),tabs=root.querySelector('[data-lateral-tabs]');if(!tabs||!panes.length)return
  const name=pane=>pane.querySelector('.pane-top strong')?.textContent?.trim()||pane.querySelector('.folded-label')?.textContent?.replace(/^\+\s*/, '').trim()||pane.dataset.pane
  if(rebuild){
    tabs.innerHTML=panes.map(pane=>lateralReaderTab(pane.dataset.pane,name(pane))).join('')
    // Remember the requested pane before the existing field click handler
    // rebuilds the shell and starts its native horizontal scroll.
    tabs.onclick=event=>{const button=event.target.closest?.('[data-jump]');if(button)requestLateralPaneFocus(runtime,button.dataset.jump)}
    const strip=root.querySelector('[data-strip]')
    if(strip){strip.onwheel=event=>{if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))runtime.lateralRequestedFocus=null};strip.onpointerdown=()=>{runtime.lateralRequestedFocus=null}}
  }
  const remembered=lateralFocusedPane(runtime),pane=panes.find(p=>p.dataset.pane===focusedId)||remembered,id=pane?.dataset.pane
  root.querySelectorAll('[data-lateral-tabs] [data-jump]').forEach(tab=>{const selected=tab.dataset.jump===id;tab.classList.toggle('active',selected);tab.setAttribute('aria-pressed',String(selected))})
  if(rebuild||id!==runtime.lateralPaintedFocus){
    const active=[...root.querySelectorAll('[data-lateral-tabs] [data-jump]')].find(tab=>tab.dataset.jump===id),a=active?.getBoundingClientRect?.(),b=tabs.getBoundingClientRect?.()
    if(a&&b){if(a.left<b.left+3)tabs.scrollLeft=Math.max(0,tabs.scrollLeft-(b.left+3-a.left));else if(a.right>b.right-3)tabs.scrollLeft+=a.right-b.right+3}
    runtime.lateralPaintedFocus=id
  }
  const label=root.querySelector('[data-lateral-focus-label]');if(label&&pane)label.textContent='FOCUS · '+name(pane)
  const index=panes.indexOf(pane);root.querySelectorAll('[data-lateral-step]').forEach(button=>button.disabled=Number(button.dataset.lateralStep)<0?index<=0:index>=panes.length-1)
}
function stepLateralReader(runtime,step){
  const panes=lateralVisiblePanes(runtime),current=lateralFocusedPane(runtime),index=panes.indexOf(current),target=panes[Math.max(0,Math.min(panes.length-1,index+Number(step)))];if(!target)return
  requestLateralPaneFocus(runtime,target.dataset.pane);focusPane(runtime,target.dataset.pane);updateLateralReaderChrome(runtime,false,target.dataset.pane)
}

function fieldReferenceCard(runtime,reference){
  const cards=[...runtime.root.querySelectorAll('[data-item-id]')].filter(card=>card.dataset.itemId===reference?.id)
  if(reference?.source_pane)return cards.find(card=>(card.dataset.sourcePane||card.closest('.field-pane')?.dataset.reading)===reference.source_pane)
  if(reference?.work_id)return cards.find(card=>card.closest('.field-pane')?.dataset.book===reference.work_id&&!card.dataset.sourcePane)
  return cards[0]
}
function fieldItemSelection(runtime,card){
  const id=String(card?.dataset.openItem||'');if(!id)return null
  const pane=card.closest('.field-pane'),reading=pane?.dataset.reading||''
  const current=String(pane?.dataset.pane||'').startsWith('book:')
  const sourcePane=card.dataset.sourcePane||(current?'':targetSourcePane(runtime,id,reading))
  if(runtime.selectionPaneData!==runtime.data){runtime.selectionPaneData=runtime.data;runtime.selectionPaneIndex=new Map(allFieldPanes(runtime).map(pane=>[pane.id,pane]))}
  const source=runtime.selectionPaneIndex.get(sourcePane)
  const work=card.dataset.itemWork||pane?.dataset.book||source?.work_id||''
  const kind=card.dataset.selectionKind||(['SOURCE','PASSAGE'].includes(source?.layer)?'passage':'axiom')
  const unit=card.dataset.selectionUnit||source?.unit_id||reading||id.split(':')[0]
  return {pane_key:pane?.dataset.pane||'',source_pane:sourcePane,work_id:work,
    value:{work_id:work,unit_id:unit,[kind==='passage'?'passage_id':'axiom_id']:id,route_root_id:runtime.data.reference?.id||''}}
}
function sameFieldSelection(a,b){
  return Boolean(a&&b&&a.pane_key===b.pane_key&&a.source_pane===b.source_pane&&a.work_id===b.work_id&&
    a.value.unit_id===b.value.unit_id&&a.value.axiom_id===b.value.axiom_id&&a.value.passage_id===b.value.passage_id&&a.value.route_root_id===b.value.route_root_id)
}
function visibleFieldItems(pane){
  return [...pane.querySelectorAll('[data-open-item]')].filter(card=>!card.closest('[hidden],details:not([open]),.folded,.care-pane-minimized')&&(!card.getClientRects||card.getClientRects().length))
}
function applyFieldSelection(runtime,panes=runtime.root.querySelectorAll('.field-pane')){
  const selected=runtime.fieldSelection
  for(const pane of panes){
    const visible=visibleFieldItems(pane),tabStop=visible.find(card=>sameFieldSelection(selected,fieldItemSelection(runtime,card)))||visible[0]
    for(const card of pane.querySelectorAll('[data-open-item]')){
      const active=sameFieldSelection(selected,fieldItemSelection(runtime,card))
      card.classList.toggle('field-item-selected',active)
      card.setAttribute('aria-current',String(active));card.tabIndex=card===tabStop?0:-1
      const routes=card.querySelector('.reader-route-action');if(routes)routes.hidden=!active
    }
  }
}
function selectFieldItem(runtime,card,{focus=true}={}){
  const selection=fieldItemSelection(runtime,card);if(!selection)return false
  const previous=runtime.fieldSelection?.pane_key
  const changed=!sameFieldSelection(runtime.fieldSelection,selection)
  runtime.fieldSelection=selection
  if(changed)applyFieldSelection(runtime,[...runtime.root.querySelectorAll('.field-pane')].filter(pane=>!previous||[previous,selection.pane_key].includes(pane.dataset.pane)))
  if(focus)card.focus?.({preventScroll:true})
  if(changed){
    // The shared viewer is already registered with these exact saved rows.
    // Hand over locally so selecting a feeder never removes the launcher for
    // a whole Streamlit rerun. An unavailable viewer retains the server path.
    const view=runtime.view||runtime.root?.ownerDocument?.defaultView
    if(view?.CustomEvent&&view.dispatchEvent){
      const value=selection.value,event=new view.CustomEvent('care-reference-select',{cancelable:true,detail:{kind:value.passage_id?'passage':'axiom',id:value.passage_id||value.axiom_id,scope:selection.source_pane,open:false}})
      view.dispatchEvent(event)
      if(event.defaultPrevented)return true
    }
    runtime.emit?.({type:'selected_axiom',work_id:selection.work_id,value:selection.value,source_pane:selection.source_pane})
  }
  return true
}
function fieldSelectionKey(runtime,event){
  if(!['Enter',' ','ArrowUp','ArrowDown','Home','End'].includes(event.key)||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return false
  if(event.target.closest?.('button,a,input,select,textarea,[contenteditable="true"]'))return false
  const card=event.target.closest?.('[data-open-item]');if(!card)return false
  if(['Enter',' '].includes(event.key)){event.preventDefault();return selectFieldItem(runtime,card)}
  const pane=card.closest('.field-pane'),cards=pane?visibleFieldItems(pane):[],index=cards.indexOf(card);if(index<0)return false
  const next=event.key==='Home'?0:event.key==='End'?cards.length-1:Math.max(0,Math.min(cards.length-1,index+(event.key==='ArrowDown'?1:-1)))
  event.preventDefault();selectFieldItem(runtime,cards[next]);cards[next].scrollIntoView?.({block:'nearest',inline:'nearest'});return true
}

const FIELD_BOOKMARK_LAYERS=new Set(['CH','CL','MC','WB','CB','NUMO','XR','XS','SC','XA'])
function fieldSavedPane(runtime,unit,scope=''){
  return arr(runtime.data.field.saved_panes).some(row=>String(row.care_unit_id||'')===String(unit)&&String(row.source_pane||'')===String(scope)&&(!row.field_id||row.field_id===runtime.data.field.id))
}
function fieldSavedAxiom(runtime,id,scope=''){
  if(!scope)return arr(runtime.data.field.favourite_axiom_ids).includes(id)
  return arr(runtime.data.field.saved_axioms).some(row=>row.care_item_id===id&&row.source_pane===scope&&(!row.field_id||row.field_id===runtime.data.field.id))
}
function fieldPaneBookmark(runtime,pane,work=''){
  const layer=String(pane.layer||pane.type||'').toUpperCase(),unit=pane.unit_id||pane.id||'',scope=pane.source_pane||''
  if(!FIELD_BOOKMARK_LAYERS.has(layer)||!unit||pane.resolved===false||/^(trace:|route:|route-target$)/.test(unit))return ''
  const active=fieldSavedPane(runtime,unit,scope),title=pane.title||unit,label=`${active?'Remove bookmark for':'Bookmark'} ${pane.layerLabel||layer} · ${title}`
  return `<button type="button" class="pane-bookmark" data-field-bookmark="${esc(unit)}" data-work="${esc(work||pane.work_id||'')}" data-source-pane="${esc(scope)}" data-bookmark-title="${esc((pane.layerLabel||layer)+' · '+title)}" aria-pressed="${active}" aria-label="${esc(label)}" title="${esc(label)}">${CORPUS_BOOK_READER.bookmarkIcon()}</button>`
}
function fieldAxiomMark(item,work=''){
  const id=item.id||item.care_item_id||'',unit=item.unit_id||'',layer=String(item.layer||'').toUpperCase()
  if(!id||!unit||!FIELD_BOOKMARK_LAYERS.has(layer)||item.resolved===false||item.kind==='passage'||item.kind==='sheet'||String(id).startsWith('FIELD:'))return ''
  return `<button type="button" class="reader-axiom-mark" data-field-favourite="${esc(id)}" data-unit="${esc(unit)}" data-work="${esc(item.work_id||work)}" data-source-pane="${esc(item.source_pane||'')}" aria-pressed="false" aria-label="Save axiom · ${esc(id)}" title="Save axiom · ${esc(id)}">${CORPUS_BOOK_READER.bookmarkIcon()}</button>`
}
function applyFieldBookmarks(runtime){
  runtime.root.querySelectorAll('[data-field-favourite]').forEach(button=>{
    const id=button.dataset.fieldFavourite,active=fieldSavedAxiom(runtime,id,button.dataset.sourcePane||''),label=`${active?'Remove saved axiom':'Save axiom'} · ${id}`
    button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',label);button.title=label
    button.closest('.field-item')?.classList.toggle('reader-axiom-saved',active)
  })
  runtime.root.querySelectorAll('[data-field-bookmark]').forEach(button=>{
    const active=fieldSavedPane(runtime,button.dataset.fieldBookmark,button.dataset.sourcePane||''),label=`${active?'Remove bookmark for':'Bookmark'} ${button.dataset.bookmarkTitle||button.dataset.fieldBookmark}`
    button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',label);button.title=label
  })
}
function fieldBookmarksMenu(runtime){
  const rows=arr(runtime.data.field.saved_panes).filter(row=>!row.field_id||row.field_id===runtime.data.field.id)
  if(!rows.length)return '<span class="desk-menu-empty">Bookmark a pane to return to it here.</span>'
  return rows.map(row=>{
    const label=[row.layer,row.title||row.care_unit_id].filter(Boolean).join(' · ')
    return `<button type="button" class="desk-tab" data-field-bookmark-open="${esc(row.care_unit_id)}" data-work="${esc(row.work_id||'')}" data-source-pane="${esc(row.source_pane||'')}"${row.available===false?' disabled':''} title="${esc(label)}">${CORPUS_BOOK_READER.bookmarkIcon()}<span>${esc(label)}</span>${row.available===false?'<small>Unavailable</small>':''}</button>`
  }).join('')
}
function fieldBookmarkClick(runtime,event){
  const button=event.target.closest?.('[data-field-bookmark],[data-field-favourite],[data-field-bookmark-open],[data-field-bookmarks]');if(!button)return false
  event.preventDefault?.();event.stopPropagation?.();if(button.disabled)return true
  if('fieldBookmarks'in button.dataset){
    const list=runtime.root.querySelector('[data-field-bookmarks-list]');if(list){list.hidden=!list.hidden;button.setAttribute('aria-expanded',String(!list.hidden));runtime.positionReaderMenu?.()}
    return true
  }
  const d=button.dataset,token=`${Date.now()}-${Math.random().toString(36).slice(2)}`,work_id=d.work||'',source_pane=d.sourcePane||'',active=button.getAttribute('aria-pressed')!=='true'
  if('fieldFavourite'in d)runtime.emit?.({type:'axiom_favourite_action',care_item_id:d.fieldFavourite,unit_id:d.unit||'',work_id,source_pane,active,token})
  else runtime.emit?.({type:'bookmark_action',action:'fieldBookmarkOpen'in d?'open':'toggle',care_unit_id:d.fieldBookmarkOpen||d.fieldBookmark,work_id,source_pane,...('fieldBookmarkOpen'in d?{}:{active}),token})
  return true
}
function prepareLateralSavedFocus(runtime){
  if(runtime.data.field.field!=='lateral')return
  const remembered=runtime.data.field.saved_reading_pane,all=allFieldPanes(runtime)
  const restored=!runtime.lastLateralSavedFocus&&remembered?all.find(pane=>pane.id===remembered):null
  const saved=runtime.data.field.saved_focus||runtime.pendingLateralSavedFocus||(restored?{source_pane:restored.id,unit_id:restored.unit_id||restored.id,token:'restored:'+restored.id}:null)
  if(!saved?.token||saved.token===runtime.lastLateralSavedFocus)return
  const scope=saved.source_pane||'',pane=all.find(pane=>pane.id===scope)
  // Keep the request while its exact pane is loading. Consuming its token now
  // would prevent a later payload from opening that saved edition.
  runtime.pendingLateralSavedFocus=saved
  if(scope&&(!pane||pane.resolved===false||(saved.unit_id&&(pane.unit_id||pane.id)!==saved.unit_id)))return
  if(scope){
    runtime.lateralSavedPane=scope
    for(const base of arr(runtime.data.field.panes))if(base.id===scope||arr(base.variants).some(variant=>variant.id===scope))runtime.state.versions[base.id]=scope
    for(const member of arr(runtime.data.field.members)){
      const origins=memberOrigins(runtime,member)
      if(origins.some(origin=>origin.id===scope)){
        const id=memberId(member);runtime.state.currentBooks[id]=false
        const base=memberOrigin(runtime,member)
        if(base)runtime.state.versions[base.id]=scope
        runtime.state.layers[id]=['WB'];runtime.state.books[id]=false
      }
    }
  }else{
    const member=arr(runtime.data.field.members).find(member=>memberId(member)===saved.work_id),unit=arr(runtime.data.stacks?.[saved.work_id]?.care_path).find(unit=>unit.id===saved.unit_id)
    if(!member||!unit)return
    runtime.lateralSavedPane='';runtime.state.currentBooks[saved.work_id]=true;runtime.state.layers[saved.work_id]=[unit.type];runtime.state.books[saved.work_id]=false;restoreLateralLayers(runtime,saved.work_id,[unit.type])
  }
  runtime.lastLateralSavedFocus=saved.token;runtime.fieldSelection=null
  for(const key of Object.keys(runtime.state.folded))if(key==='field:'+scope||runtime.state.versions[key.replace(/^field:/,'')]===scope)runtime.state.folded[key]=false
  for(const [key,state] of Object.entries(runtime.paneControlState||{}))if(key.endsWith('|field:'+scope)||runtime.state.versions[key.split('|field:')[1]]===scope)state.minimized=false
}
function applyLateralSavedFocus(runtime){
  const saved=runtime.pendingLateralSavedFocus;if(!saved||runtime.lastLateralSavedFocus!==saved.token)return
  const scope=saved.source_pane||'',panes=[...runtime.root.querySelectorAll('.field-pane')],pane=panes.find(pane=>scope?pane.dataset.reading===scope:pane.dataset.book===saved.work_id&&pane.dataset.reading===saved.unit_id)
  if(!pane)return
  runtime.pendingLateralSavedFocus=null;requestLateralPaneFocus(runtime,pane.dataset.pane);focusPane(runtime,pane.dataset.pane)
  if(saved.care_item_id){
    const card=[...pane.querySelectorAll('[data-open-item]')].find(card=>card.dataset.itemId===saved.care_item_id&&String(card.dataset.sourcePane||'')===scope)
    if(card){const section=card.closest('details');if(section)section.open=true;runtime.fieldSelection=fieldItemSelection(runtime,card);applyFieldSelection(runtime);card.scrollIntoView?.({block:'center',inline:'nearest'});card.focus?.({preventScroll:true})}
  }
}

const INSTANCES=new WeakMap()
// Dispose each set of outer handlers once. A late framework cleanup must not
// remove a newer render's handlers or its still-mounted corpus readers.
function beginFieldRender(runtime){
  runtime.renderCleanup?.(true)
  return cleanup=>{
    let disposed=false
    const dispose=(keepReaders=false)=>{
      if(disposed)return
      disposed=true
      if(runtime.renderCleanup===dispose)runtime.renderCleanup=null
      cleanup()
      if(!keepReaders)cleanupCorpusReaders(runtime)
    }
    runtime.renderCleanup=dispose
    return dispose
  }
}
const arr=value=>Array.isArray(value)?value:[]
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const COLORS={SOURCE:'#8a431d',CH:'#3d668b',CL:'#2d6b67',MC:'#594f88',WB:'#9a4327',CB:'#a96624',XR:'#6e4f9a',XS:'#8b4f86',SC:'#8f394b',XA:'#51667e',LATERAL:'#8e658d',CORPUS:'#a96624',NUMO:'#3d765a',ROUTES:'#537f85'}
const LAYERS=['SOURCE','CH','CL','MC','WB']
const color=layer=>COLORS[String(layer).toUpperCase()]||'#736486'
const memberId=member=>String(member.work_id||member.id||'')
function fieldDefaults(){return {widths:{},folded:{},layers:{},books:{},positions:{},sections:{},versions:{},currentBooks:{},left:0,manager:false,lineage:false,started:false,query:'',scale:1}}
function readLayout(view,id){try{const s=JSON.parse(view.localStorage.getItem('care-field-layout-v3:'+id)||'null');if(s&&typeof s==='object')return {...fieldDefaults(),...s,widths:s.widths||{},folded:s.folded||{},layers:s.layers||{},books:s.books||{},positions:s.positions||{},sections:s.sections||{},versions:s.versions||{},currentBooks:s.currentBooks||{},scale:Math.max(.8,Math.min(1.5,Number(s.scale)||1))}}catch(_){}return fieldDefaults()}
function availableLayers(member,stack){const found=new Set((stack?[...arr(stack.care_path).map(p=>p.type),...Object.entries(stack.sheet_options||{}).filter(([,options])=>arr(options).some(option=>option.available!==false)).map(([layer])=>layer)]:arr(member.layers)).map(x=>String(x).toUpperCase()));if(stack?arr(stack.chapters).some(ch=>ch.readable!==false):member.has_source)found.add('SOURCE');return LAYERS.filter(layer=>found.has(layer))}
function selectedLayers(state,member,stack){const id=memberId(member),available=availableLayers(member,stack);return arr(state.layers[id]||[available.includes('WB')?'WB':available[0]||'SOURCE']).filter(layer=>available.includes(layer))}
function inline(text){return esc(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')}
function prose(text){return String(text||'').split(/\n\s*\n/).map(block=>{if(block.startsWith('```')){return `<pre>${esc(block.replace(/^```[^\n]*\n?|\n?```$/g,''))}</pre>`}const heading=block.match(/^(#{1,6})\s+([^\n]+)(?:\n([\s\S]*))?$/);if(heading){const level=Math.min(4,heading[1].length+1);return `<h${level}>${inline(heading[2])}</h${level}>${heading[3]?`<p>${inline(heading[3])}</p>`:''}`}if(block.split('\n').every(line=>/^\s*[-*]\s+/.test(line)))return `<ul>${block.split('\n').map(line=>`<li>${inline(line.replace(/^\s*[-*]\s+/,''))}</li>`).join('')}</ul>`;return `<p>${inline(block)}</p>`}).join('')}
function activeFieldPanes(runtime){return arr(runtime.data.field.panes).map(base=>[base,...arr(base.variants)].find(p=>p.id===runtime.state.versions?.[base.id])||base)}
function allFieldPanes(runtime){const pending=[...arr(runtime.data.field.panes),...arr(runtime.data.field.route_panes),...arr(runtime.data.reference?.resolution_panes)],result=[],seen=new Set();while(pending.length){const pane=pending.shift();if(seen.has(pane.id))continue;seen.add(pane.id);result.push(pane);pending.push(...arr(pane.variants))}return result}
function targetSourcePane(runtime,id,origin){const all=allFieldPanes(runtime),reference=runtime.data.reference,contains=p=>[...arr(p.items),...arr(p.sections).flatMap(section=>arr(section.items))].some(item=>(item.id||item.care_item_id)===id);const own=all.find(p=>p.id===origin&&contains(p));if(own)return own.id;if(reference?.preserved){const feeders=arr(reference.built_from).filter(item=>item.id===id&&item.source_pane);if(feeders.length===1&&(!origin||origin===reference.source_pane||origin.startsWith('trace:')||origin.startsWith('route:')))return feeders[0].source_pane;if(!all.some(p=>p.id===origin))origin=reference.source_pane||''}const context=all.find(p=>p.id===origin),targets=all.filter(contains),bound=targets.filter(p=>arr(context?.origin_pane_ids).includes(p.id)||arr(p.used_by_panes).includes(origin));if(bound.length===1)return bound[0].id;if(context?.strict_origin_bindings)return origin;if(!context&&!reference?.preserved)return '';const active=activeFieldPanes(runtime).filter(contains);return active.find(p=>p.role==='origin')?.id||active[0]?.id||''}
function referenceButton(id,label,workId='',sourcePane=''){return `<button type="button" data-reference="${esc(id)}" data-work="${esc(workId)}"${sourcePane?` data-source-pane="${esc(sourcePane)}"`:''}>${esc(label||id)}</button>`}
function fieldRouteButton(id,workId='',sourcePane=''){
  const label=`Open routes for ${id}`
  return `<button type="button" class="reader-route-action" data-reference="${esc(id)}" data-work="${esc(workId)}"${sourcePane?` data-source-pane="${esc(sourcePane)}"`:''} aria-label="${esc(label)}" title="${esc(label)}">${CORPUS_BOOK_READER.etchedRouteIcon()}</button>`
}
function itemHTML(item,workId,reference,markdown=false){
  if(item.kind==='sheet'){
    const sourcePane=item.source_pane||'',sections=arr(item.sections).map(section=>({...section,items:arr(section.items).map(axiom=>({...axiom,source_pane:sourcePane,unit_id:item.unit_id,layer:item.layer}))}))
    return `<article class="field-item" data-item-id="${esc(item.id)}" data-source-pane="${esc(sourcePane)}"><span class="item-address">${esc(item.work_title||item.title||item.id)}</span><p class="item-copy">Whole-book reference · no individual axiom specified</p></article>${sectionsHTML({sections},workId,reference)}`
  }
  const id=String(item.id||item.care_item_id||''),routable=Boolean(id&&!id.startsWith('FIELD:')&&item.resolved!==false),sourcePane=item.source_pane||'',kind=item.kind==='passage'||['SOURCE','PASSAGE'].includes(item.layer)?'passage':'axiom'
  const traces=[...new Set([...arr(item.source_trace),...arr(item.deep_source_trace),...arr(item.matrix_trace),...arr(item.passage_trace_ids)].map(value=>typeof value==='object'?value.id||value.ref||'':String(value)).filter(Boolean))]
  const selected=id&&id===reference?.id&&(!sourcePane||!reference.source_pane||sourcePane===reference.source_pane)
  return `<article class="field-item ${selected?'selected':''}" data-item-id="${esc(id)}" data-source-pane="${esc(sourcePane)}" ${routable?`data-open-item="${esc(id)}" data-item-work="${esc(item.work_id||workId)}" data-selection-unit="${esc(item.unit_id||'')}" data-selection-kind="${kind}" tabindex="0" aria-label="Select ${kind} ${esc(id)}"`:''}><span class="item-address" ${kind==='axiom'?CORPUS_BOOK_READER.axiomCopyAttributes(id):''}>${esc(item.address||id||item.label||'')}</span>${routable?fieldRouteButton(id,item.work_id||workId,sourcePane):''}${kind==='axiom'?CORPUS_BOOK_READER.axiomCopyStatus():''}${markdown?`<div class="field-prose item-prose">${item.reading_block_html ?? prose(item.text||item.item_text||'')}</div>`:`<p class="item-copy">${item.reading_html ?? esc(item.text||item.item_text||'')}</p>`}${traces.length?`<span class="item-trace">${traces.length} exact ${traces.length===1?'trace':'traces'}</span>`:''}${reference&&traces.length?`<div class="item-links">${traces.map(ref=>referenceButton(ref,ref,workId)).join('')}</div>`:''}${fieldAxiomMark(item,workId)}</article>`
}
function sectionsHTML(pane,workId,reference){const sections=arr(pane.sections).length?pane.sections:arr(pane.items).length?[{name:pane.title||'Reading',items:pane.items}]:[];const dialogue=/^WORK_DLG_/i.test(String(workId||pane.work_id||''))||/^CH_DLG_/i.test(String(pane.unit_id||pane.id||'')),defaultSectionIndex=dialogue?0:Math.min(1,sections.length-1);return sections.length?`<div class="field-sections">${sections.map((section,index)=>`<details class="field-section" data-section="${index}" ${index===defaultSectionIndex?'open':''}><summary><span>${esc(section.number||index+1)} · ${esc(section.name||section.title||'Reading')}</span><small>${arr(section.items).length}</small></summary><div>${arr(section.items).map(item=>itemHTML({...item,source_pane:item.source_pane||pane.source_pane||'',unit_id:item.unit_id||pane.unit_id||pane.id||'',layer:item.layer||pane.layer||pane.type},workId,reference,pane.format==='markdown')).join('')}</div></details>`).join('')}</div>`:pane.text||pane.markdown?`<div class="field-prose">${pane.reading_block_html ?? prose(pane.text||pane.markdown)}</div>`:'<div class="field-empty">No reading has been saved for this layer yet.</div>'}
// Keep a plain layer label in the top bar while the reading title leads below.
// Saved names and provenance remain available in the full view and tooltips.
function fieldPaneTitles(runtime,pane,workId){
  const layer=String(pane.layer||pane.type||'READING').split(':')[0],title=pane.title||layer,stack=runtime.data.stacks?.[workId]||{}
  const level=layer==='MC'?CORPUS_BOOK_READER.mcLevel(pane):null
  const options=layer==='SOURCE'?arr(stack.chapters):arr(stack.sheet_options?.[layer]).filter(item=>layer!=='MC'||CORPUS_BOOK_READER.mcLevel(item)===level)
  const ids=new Set([pane.id,pane.unit_id,pane.raw_unit_id,pane.reader_option_id].filter(Boolean)),index=options.findIndex(item=>[item.id,item.unit_id,item.raw_unit_id].some(id=>ids.has(id)))
  const fieldPeers=activeFieldPanes(runtime).filter(item=>String(item.layer||item.type).split(':')[0]===layer&&(layer!=='MC'||CORPUS_BOOK_READER.mcLevel(item)===level)),fieldIndex=fieldPeers.findIndex(item=>ids.has(item.id)||ids.has(item.unit_id))
  const ordinal=[pane.sequence_number,pane.chapter_number,options[index]?.sequence_number,options[index]?.chapter_number].map(Number).find(value=>Number.isInteger(value)&&value>0)||(index>=0?index+1:fieldIndex>=0?fieldIndex+1:null)
  const simple=CORPUS_BOOK_READER.paneSimpleTitle({...pane,title,identity:{...pane.identity,title},...(!options.length&&ordinal?{sequence_number:ordinal}:{})},stack,layer)
  const top=layer==='SOURCE'?(ordinal?String(ordinal):'Source text'):layer==='CH'?`Chapter${ordinal?' '+ordinal:''}`:layer==='WB'?'Whole book':simple
  return {simple,top}
}
function paneHTML(runtime,pane,{workId='',tools='',body='',subtitle=''}={}){const s=runtime.state,key=String(pane.key||pane.id),folded=runtime.data.reference?false:s.folded[key],layer=pane.layer||pane.type||'READING',layerLabel=pane.layerLabel||CORPUS_BOOK_READER.readerLayerLabel(layer,{...pane,mc_level:pane.macro_level||pane.mc_level}),width=Number(s.widths[key]),title=pane.title||layer,titles=fieldPaneTitles(runtime,pane,workId);return `<section class="field-pane ${folded?'folded':''}" data-pane="${esc(key)}" data-book="${esc(workId)}" data-reading="${esc(pane.id||key)}" style="--color:${pane.accent||color(layer)};${Number.isFinite(width)&&width>=300?`--pane-width:${Math.min(1400,width)}px`:''}" aria-label="${esc(`${layer}: ${title}`)}"><button type="button" class="folded-label" data-fold="${esc(key)}" aria-label="Restore ${esc(title)}">+ &nbsp; ${esc(layer)} · ${esc(title)}</button><header class="pane-top"><strong title="${esc(`${layerLabel}: ${title}`)}"><span class="reader-full-title">${esc(layerLabel)} / ${esc(title)}</span><span class="reader-simple-title">${esc(layerLabel)} / ${esc(titles.top)}</span></strong><small>${esc(pane.count||'')}</small>${fieldPaneBookmark(runtime,pane,workId)}<button type="button" class="icon" data-wide="${esc(key)}" aria-label="Widen ${esc(title)}" title="Widen pane">↔</button><button type="button" class="icon" data-fold="${esc(key)}" aria-label="Minimise ${esc(title)}" title="Minimise pane">−</button></header>${tools?`<div class="pane-tools">${tools}</div>`:''}<div class="pane-body"><div class="pane-intro"><span class="kicker">${esc(subtitle||layer)}</span><h3 title="${esc(title)}"><span class="reader-full-title">${esc(title)}</span><span class="reader-simple-title">${esc(titles.simple)}</span></h3>${CORPUS_BOOK_READER.readerPaneImprint(pane,layer)}${pane.description?`<p${layer==='SOURCE'?' class="pane-author"':''} title="${esc(pane.description)}">${esc(pane.description)}</p>`:''}${arr(pane.source_work_titles).length?`<p class="pane-source-works" title="${esc(pane.source_work_titles.join(' · '))}">Works feeding this reading: ${pane.source_work_titles.map(esc).join(' · ')}</p>`:''}</div>${body||sectionsHTML(pane,workId,runtime.data.reference)}</div><div class="resize-handle" data-resize="${esc(key)}" role="separator" tabindex="0" aria-orientation="vertical" aria-valuemin="300" aria-valuemax="1400" aria-valuenow="${Number.isFinite(width)?width:540}" aria-label="Resize ${esc(title)}" title="Drag to resize · arrow keys adjust · double-click resets"></div></section>`}
function bookPane(runtime,member,layer,selectedUnit=null){
  const id=memberId(member),stack=runtime.data.stacks?.[id],units=arr(stack?.care_path).filter(pane=>pane.type===layer)
  // MC is a hierarchy: retain every linked level, as the Library reader does.
  if(layer==='MC'&&!selectedUnit&&units.length>1)return [...units].sort((a,b)=>(CORPUS_BOOK_READER.mcLevel(a)||0)-(CORPUS_BOOK_READER.mcLevel(b)||0)).map(unit=>bookPane(runtime,member,layer,unit)).join('')
  const unit=selectedUnit||units[0],level=layer==='MC'?CORPUS_BOOK_READER.mcLevel(unit):null,key=`book:${id}:${layer}${level?':L'+level:''}`,chapter=stack?.active_chapter
  let pane,body='',tools=''
  if(layer==='SOURCE'){
    pane={...chapter,id:chapter?.raw_unit_id||key,title:chapter?.title||'Source text',layer,description:stack?.work?.author||member.author}
    body=chapter?`<div class="field-prose">${arr(chapter.passages).map(p=>itemHTML({...p,kind:'passage',unit_id:chapter.raw_unit_id},id,runtime.data.reference,true)).join('')}</div>`:'<div class="field-empty">No readable source chapter is registered.</div>'
  }else pane={...unit,id:unit?.id||key,title:layer==='WB'?member.title:unit?.identity?.title||unit?.title||layer,layer,layerLabel:CORPUS_BOOK_READER.readerLayerLabel(layer,unit),accent:CORPUS_BOOK_READER.layerColor(layer,unit),description:unit?.identity?.context||unit?.id||member.title}
  const options=(layer==='SOURCE'?arr(stack?.chapters):arr(stack?.sheet_options?.[layer])).filter(option=>layer!=='MC'||CORPUS_BOOK_READER.mcLevel(option)===level)
  if(options.length>1)tools=`<select data-sheet="${esc(layer)}" data-work="${esc(id)}" aria-label="${esc(member.title)} · ${esc(pane.layerLabel||layer)} reading">${options.map(option=>{const value=option.id||option.raw_unit_id;return `<option value="${esc(value)}" ${value===pane.id?'selected':''} ${option.available===false||option.readable===false?'disabled':''}>${esc(option.identity?.title||option.title||option.label||value)}</option>`}).join('')}</select>`
  return paneHTML(runtime,{...pane,key},{workId:id,tools,body,subtitle:layer==='WB'?'Whole book':member.title})
}

function readingPane(runtime,base,{member=null}={}){
  const variants=[base,...arr(base.variants)],pane=variants.find(p=>p.id===runtime.state.versions?.[base.id])||base
  const versions=variants.length>1?`<select data-version="${esc(base.id)}" aria-label="${esc(member?.title||base.title)} saved version">${variants.map(p=>`<option value="${esc(p.id)}" ${p.id===pane.id?'selected':''}>${esc(p.version||p.id)}${p===base?' · latest':''}</option>`).join('')}</select>`:''
  const source={...pane,source_pane:pane.id,...(member?{title:member.title,description:pane.description||pane.version,source_work_titles:[]}: {})}
  return paneHTML(runtime,{...source,key:`field:${base.id}`},{workId:member?memberId(member):'',tools:versions,subtitle:member?'Whole book · saved source':base.role==='origin'?'Recorded origin':pane.version?`${pane.layer} · ${pane.version}`:pane.layer})
}
// Saved sources replace the matching current WB in the reading strip. Keep their
// original pane IDs so choosing a version or following a trace retains provenance.
function memberOrigins(runtime,member){
  const id=memberId(member),units=new Set([...arr(member.source_unit_ids),...arr(runtime.data.field.source_units).filter(unit=>unit.work_id===id).map(unit=>unit.unit_id||unit.id)])
  return allFieldPanes(runtime).filter(pane=>pane.role==='origin'&&!pane.overview_metadata_only&&pane.layer==='WB'&&(pane.work_id===id||units.has(pane.unit_id)))
}
function memberOrigin(runtime,member){
  if(runtime.state.currentBooks[memberId(member)])return null
  const origins=memberOrigins(runtime,member),bound=new Set(activeFieldPanes(runtime).filter(pane=>pane.role!=='origin').flatMap(pane=>arr(pane.origin_pane_ids)))
  const selected=origins.find(pane=>bound.has(pane.id))||origins[0]
  if(!selected)return null
  // Only versions of this WB belong in its selector; no current replacement is
  // silently substituted when a saved source cannot be read.
  return {...selected,variants:origins.filter(pane=>pane.id!==selected.id).map(pane=>({...pane,variants:[]}))}
}
function initializeLayout(runtime){
  const s=runtime.state
  arr(runtime.data.field.members).forEach((member,index)=>{const id=memberId(member);s.books[id]=!runtime.data.stacks?.[id]&&!(index<2&&memberOrigin(runtime,member))})
  s.started=true
}
function memberWorkspace(runtime,member){
  const id=memberId(member),stack=runtime.data.stacks?.[id],origin=memberOrigin(runtime,member),s=runtime.state
  if(s.books[id]||(!stack&&!origin))return `<section class="field-pane folded" data-pane="member:${esc(id)}" data-book="${esc(id)}" style="--color:${color('WB')}"><button type="button" class="folded-label" data-load="${esc(id)}" aria-label="${stack||origin?'Restore':'Open'} ${esc(member.title)}">+ &nbsp; ${esc(member.title)}${stack||origin?'':' · Open book'}</button></section>`
  const selected=selectedLayers(s,member,stack),layers=origin&&!Object.hasOwn(s.layers,id)?['WB']:selected
  return (runtime.data.field.field==='lateral'&&arr(runtime.data.field.members).findIndex(member=>memberId(member)===id)>0?[...layers].reverse():layers).map(layer=>layer==='WB'&&origin?readingPane(runtime,origin,{member}):bookPane(runtime,member,layer)).join('')||`<section class="field-pane folded" data-pane="member:${esc(id)}"><button type="button" class="folded-label" data-load="${esc(id)}">+ &nbsp; ${esc(member.title)} · Choose layers</button></section>`
}
function workspaceEntries(runtime){
  const field=runtime.data.field,members=arr(field.members),claimed=new Set(members.flatMap(member=>memberOrigins(runtime,member).map(pane=>pane.id)))
  const books=members.map(member=>({id:`member:${memberId(member)}`,title:`WB · ${member.title}`,layer:'WB',member}))
  const readings=arr(field.panes).filter(pane=>pane.role!=='origin'||!claimed.has(pane.id)).map(pane=>({id:`field:${pane.id}`,title:`${pane.layer} · ${pane.title}`,layer:pane.layer,pane}))
  // A lateral is a bridge between its books; corpus members stay together while
  // unloaded members follow the reading, avoiding a wall of closed book spines.
  if(field.field==='lateral'){
    const saved=allFieldPanes(runtime).find(pane=>pane.id===runtime.lateralSavedPane),present=saved&&[...readings.map(row=>row.pane),...members.flatMap(member=>memberOrigins(runtime,member))].some(pane=>pane.id===saved.id||arr(pane.variants).some(variant=>variant.id===saved.id))
    const extra=saved&&!present?[{id:'field:'+saved.id,title:saved.layer+' · '+saved.title,layer:saved.layer,pane:saved}]:[],left=saved?.work_id===memberId(members[0]||{})
    return [...(left?extra:[]),...books.slice(0,1),...readings,...books.slice(1),...(!left?extra:[])]
  }
  const visible=books.filter(entry=>!runtime.state.books[memberId(entry.member)]),pending=books.filter(entry=>runtime.state.books[memberId(entry.member)])
  return [...visible,...readings,...pending]
}
function fieldWorkspace(runtime,entries=workspaceEntries(runtime)){
  return entries.map(entry=>entry.member?memberWorkspace(runtime,entry.member):readingPane(runtime,entry.pane)).join('')+(runtime.data.field.field==='lateral'?'':lineagePane(runtime))
}
function lineagePane(runtime){if(!runtime.state.lineage)return '';const field=runtime.data.field,edges=arr(field.routes).filter(edge=>edge.kind!=='axiom_trace'),groups=new Map();edges.forEach(edge=>{const key=edge.to_pane||edge.to;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(edge)});const rows=[...groups].map(([key,edges])=>{const pane=arr(field.panes).find(p=>p.id===key||p.unit_id===key||arr(p.variants).some(v=>v.id===key));return `<div class="lineage-row"><strong>${esc(pane?.title||edges[0].to)}</strong><small>${esc(edges[0].version||'Declared inputs')}</small><div class="item-links">${[...new Set(edges.map(e=>e.from))].map(id=>{const source=arr(field.panes).find(p=>p.unit_id===id);return source?`<button type="button" data-jump="field:${esc(source.id)}">${esc(source.title||id)}</button>`:`<span>${esc(id)}</span>`}).join(' <span>+</span> ')} <span>→</span> ${pane?`<button type="button" data-jump="field:${esc(pane.id)}">${esc(edges[0].to)}</button>`:esc(edges[0].to)}</div></div>`}).join('');const sources=arr(field.source_units).map(unit=>`<div class="lineage-row"><strong>${esc(unit.title||unit.id)}</strong><small>${esc(unit.id)}${arr(unit.revisions).map(rev=>` · ${esc(rev.revision_id||rev.seal_id||'Recorded revision')}`).join('')}</small></div>`).join('');return paneHTML(runtime,{id:'lineage',layer:'ROUTES',title:'Reading lineage',description:field.source_reading_context},{body:(rows||'<div class="field-empty">No sheet-level parent links are registered for this reading. Individual citations remain available in the text.</div>')+sources,subtitle:'Declared inputs → resulting reading'})}
function routeLayerRank(layer){const order=['SOURCE','PASSAGE','CH','CL','MC','WB','CB','XR','XS','SC','XA','NUMO'];const i=order.indexOf(String(layer||'').toUpperCase());return i<0?order.length:i}
function routeWorkspace(runtime){
  const reference=runtime.data.reference;if(!reference)return ''
  const groups=new Map(),targetId=reference.id
  const routeCards=Object.values(reference.route_layers||{}).flatMap(arr)
  for(const item of routeCards.length?routeCards:arr(reference.built_from)){
    if(item.id===targetId&&(!reference.source_pane||item.source_pane===reference.source_pane))continue
    const layer=item.layer==='PASSAGE'?'SOURCE':item.layer||'TRACE',level=layer==='MC'?CORPUS_BOOK_READER.mcLevel(item.unit_id):null,id=`trace:${item.work_id||item.source_pane||item.unit_id||'field'}:${layer}${level?':L'+level:''}`
    if(!groups.has(id))groups.set(id,{id,layer,level,workId:item.work_id||'',title:item.work_title||item.sheet_title||`${layer} route feeders`,items:[]})
    if(!groups.get(id).items.some(old=>old.id===item.id&&old.source_pane===item.source_pane))groups.get(id).items.push(item)
  }
  const compare=(a,b)=>routeLayerRank(a.layer)-routeLayerRank(b.layer)||(a.level||0)-(b.level||0)
  const ordered=[...groups.values()].sort(compare)
  const feeder=group=>{
    const units=new Map();group.items.forEach(item=>{const key=(item.source_pane||'')+'|'+(item.unit_id||item.id?.split(':')[0]||group.layer);if(!units.has(key))units.set(key,[]);units.get(key).push(item)})
    const entries=[...units],label=items=>{
      const item=items[0],pane=allFieldPanes(runtime).find(pane=>pane.id===item.source_pane),title=pane?.identity?.title||pane?.title||item.sheet_title,option=arr(runtime.data.stacks?.[group.workId]?.sheet_options?.[group.layer]).find(option=>option.id===item.unit_id)
      return title&&title!==group.title&&title!==item.work_title&&title!==item.unit_id?title:option?.title||item.unit_id||title||group.layer
    }
    const tools=`<select data-route-unit="${esc(group.id)}" aria-label="${esc(group.layer)} readings for ${esc(group.title)}">${entries.map(([key,items])=>`<option value="${esc(key)}">${esc(label(items))}${items[0].version?' · '+esc(items[0].version):''}</option>`).join('')}</select><span class="route-unit-count">${entries.length} ${entries.length===1?'reading':'readings'}</span>`
    const body=entries.map(([unit,items],index)=>`<details class="field-section route-feeder-block" data-section="${esc(unit)}" data-route-unit-block="${esc(unit)}" open><summary><span>${esc(label(items))}</span><small>${items.length}</small></summary><div class="route-unit-heading">${fieldPaneBookmark(runtime,{id:items[0].source_pane,unit_id:items[0].unit_id,source_pane:items[0].source_pane,layer:group.layer,title:label(items),resolved:items[0].resolved},group.workId)}</div>${items.map(item=>itemHTML(item,item.work_id||'',reference)).join('')}</details>`).join('')
    return paneHTML(runtime,{id:group.id,layer:group.layer,layerLabel:group.level?'MC L'+group.level:group.layer,accent:CORPUS_BOOK_READER.layerColor(group.layer,{id:group.items[0]?.unit_id}),title:group.title,description:group.items[0]?.work_title===group.title?'':group.items[0]?.work_title||'',source_work_titles:[...new Set(group.items.flatMap(item=>arr(item.source_work_titles)))],count:`${group.items.length} ${group.items.length===1?'SOURCE':'SOURCES'}`},{workId:group.workId,tools,body:`<div class="route-focus-note">FEEDING INTO · ${esc(reference.sheet_title||reference.title||reference.layer||'READING')}<strong>${esc(reference.id)}</strong><small>Select a feeder to follow its own route.</small></div><div class="field-sections">${body}</div>`,subtitle:'Recorded connections'})
  }
  let target='';const source=allFieldPanes(runtime).find(p=>p.id===reference.source_pane)
  if(source){const sections=arr(source.sections).map(section=>({...section,items:arr(section.items).filter(item=>item.id===targetId)})).filter(section=>section.items.length);target=readingPane(runtime,{...source,variants:[],sections,items:arr(source.items).filter(item=>item.id===targetId)})}
  else if(!reference.preserved){const member=arr(runtime.data.field.members).find(m=>memberId(m)===reference.work_id);if(member)target=bookPane(runtime,member,reference.kind==='passage'?'SOURCE':reference.layer)}
  if(!target)target=paneHTML(runtime,{id:'route-target',layer:reference.layer||'ROUTES',title:reference.title||reference.id,description:reference.metadata,sections:[{name:'Selected reading',items:[reference]}]})
  if(runtime.data.field.field==='lateral'){
    const members=arr(runtime.data.field.members).map(memberId),origin=members[0],entries=[...ordered.map(group=>({...group,html:feeder(group)})),{workId:reference.work_id||source?.work_id||'',layer:reference.layer,level:CORPUS_BOOK_READER.mcLevel(reference.unit_id),html:target}]
    const left=entries.filter(group=>group.workId===origin).sort(compare),right=entries.filter(group=>group.workId&&group.workId!==origin&&members.includes(group.workId)).sort((a,b)=>members.indexOf(a.workId)-members.indexOf(b.workId)||compare(b,a)),middle=entries.filter(group=>!members.includes(group.workId)).sort(compare)
    return [...left,...middle,...right].map(group=>group.html).join('')
  }
  const rank=routeLayerRank(reference.layer)
  return ordered.filter(g=>routeLayerRank(g.layer)<=rank).map(feeder).join('')+target+ordered.filter(g=>routeLayerRank(g.layer)>rank).map(feeder).join('')
}
function routePane(runtime){return routeWorkspace(runtime)}
function managerHTML(runtime){const s=runtime.state,members=arr(runtime.data.field.members);return `<div class="field-manager" ${s.manager?'':'hidden'}><div class="manager-tools"><input type="search" data-member-search aria-label="Find a source book" placeholder="Find a source book…" value="${esc(s.query)}"><span>${members.length} source ${members.length===1?'book':'books'}</span><button type="button" class="control" data-books-fold="yes">Minimise books</button><button type="button" class="control" data-books-fold="no">Restore books</button><button type="button" class="control" data-reset>Reset layout</button></div><div class="output-controls"><span>Reading panes</span>${arr(runtime.data.field.panes).map(p=>`<button type="button" class="control ${s.folded['field:'+p.id]?'':'active'}" data-fold="field:${esc(p.id)}" aria-pressed="${!s.folded['field:'+p.id]}">${esc(p.title)}</button>`).join('')}</div><div class="member-list">${members.map(member=>{const id=memberId(member),stack=runtime.data.stacks?.[id],available=availableLayers(member,stack),selected=selectedLayers(s,member,stack);return `<div class="member-controls" data-member-row="${esc((member.title+' '+member.author).toLowerCase())}" ${s.query&&!`${member.title} ${member.author}`.toLowerCase().includes(s.query.toLowerCase())?'hidden':''}><div class="member-name">${esc(member.title)}<small>${esc(member.author||'')}${stack?'':' · Opens on demand'}</small></div><div class="member-layers" aria-label="${esc(member.title)} layers">${available.map(layer=>`<button type="button" class="control ${selected.includes(layer)?'active':''}" style="--color:${color(layer)}" data-layer="${layer}" data-work="${esc(id)}" aria-pressed="${selected.includes(layer)}">${layer}</button>`).join('')}<button type="button" class="control" data-all-layers="${esc(id)}">All layers</button>${memberOrigins(runtime,member).length?`<button type="button" class="control" data-current-book="${esc(id)}">${s.currentBooks[id]?'Saved WB':'Current WB'}</button>`:''}<button type="button" class="control" data-book-fold="${esc(id)}">${s.books[id]?'Restore':'Minimise'}</button></div></div>`}).join('')||'<div class="field-empty">This reading has no registered source books.</div>'}</div></div>`}
function isCorpusTracks(runtime){return runtime.data.field.field==='corpus'}
function corpusState(runtime){
  const s=runtime.state
  s.trackZoom=s.trackZoom||{};s.trackLeft=s.trackLeft||{}
  if(s.corpusLayoutVersion!==4){
    s.corpusLayoutVersion=4;s.corpusZoom=1;s.corpusFocus='';s.corpusScroll=0;s.corpusDepth='WB'
    s.corpusOpen=Object.fromEntries(corpusReadingRows(runtime).map(member=>[memberId(member),true]))
    s.currentBooks={}
  }
  s.corpusOpen=s.corpusOpen||{}
  const inputs=corpusReadingRows(runtime),inputIds=new Set(inputs.map(memberId)),stale=Object.keys(s.corpusOpen).filter(id=>!inputIds.has(id))
  inputs.forEach(member=>{const id=memberId(member);if(!(id in s.corpusOpen))s.corpusOpen[id]=true})
  if(stale.length){stale.forEach(id=>delete s.corpusOpen[id]);if(inputs.length&&!Object.values(s.corpusOpen).some(Boolean))s.corpusOpen[memberId(inputs[0])]=true}
  const expanded=runtime.data.field.expanded_member_id||''
  if(expanded!==runtime.lastServerExpanded){
    if(expanded){s.corpusFocus=expanded;s.corpusOpen[expanded]=true;runtime.corpusScrollTo=expanded}
    runtime.lastServerExpanded=expanded
  }
  const remembered=runtime.data.field.saved_reading_pane,saved=runtime.data.field.saved_focus||(!runtime.lastCorpusSavedFocus&&remembered?{source_pane:remembered,token:'restore:'+remembered}:null)
  if(saved?.token&&saved.token!==runtime.lastCorpusSavedFocus){
    const exact=saved.source_pane?allFieldPanes(runtime).find(pane=>pane.id===saved.source_pane&&!pane.overview_metadata_only):null
    const input=corpusReadingRows(runtime).find(row=>saved.source_pane?arr(row.corpusVariants).some(pane=>pane.id===saved.source_pane):memberId(row)===saved.work_id)
    if(!saved.source_pane||exact){
      runtime.lastCorpusSavedFocus=saved.token;runtime.corpusSavedFocus=saved;s.corpusFocus=''
      if(input){const id=memberId(input);s.corpusOpen[id]=true;runtime.corpusScrollTo=id;if(exact){s.corpusEditions=s.corpusEditions||{};s.corpusEditions[id]=exact.id;(s.corpusBuildSheets||(s.corpusBuildSheets={})).CORPUS_INPUT=exact.id}}
      else if(exact){
        const output=corpusOutputs(runtime).find(pane=>pane.id===exact.id)
        if(output){s.corpusOutput=exact.id;if(exact.layer==='CB')(s.corpusBuildSheets||(s.corpusBuildSheets={})).CB=exact.id;else selectCorpusBuildSheet(runtime,exact.id,{render:false})}
        else runtime.corpusScrollTo='saved:'+exact.id
      }
    }
  }
  return s
}
function corpusOutputs(runtime){return [...arr(runtime.data.field.panes).filter(p=>p.role!=='origin'),...allFieldPanes(runtime).filter(p=>p.role==='origin'&&!p.overview_metadata_only&&p.layer==='CB'&&arr(p.origin_pane_ids).length)]}
function corpusOutput(runtime){
  const outputs=corpusOutputs(runtime),id=runtime.state.corpusOutput
  return outputs.find(p=>p.id===id)||outputs.find(p=>p.layer==='CB')||outputs[outputs.length-1]
}
function corpusSavedOrigin(runtime,member){
  if(member.corpusOrigin)return member.corpusOrigin
  const origins=memberOrigins(runtime,member),selected=runtime.state.corpusEditions?.[memberId(member)]
  return origins.find(p=>p.id===selected)||memberOrigin(runtime,member)
}
function corpusSheetStack(runtime,pane,member){
  if(!pane)return null
  const unit=typeof CORPUS_BOOK_READER!=='undefined'?CORPUS_BOOK_READER.fieldUnit(pane):{...pane,id:pane.unit_id||pane.id,type:pane.layer}
  unit.corpus_source_pane=pane.id
  unit.sections=arr(unit.sections).length?unit.sections:[{name:'Saved reading',number:'1',items:arr(pane.items)}]
  if(member)unit.identity={...unit.identity,title:member.title,kicker:'Whole book · saved source',context:pane.version||'Edition used by this corpus'}
  return {work:{id:member?memberId(member):runtime.data.field.id+'|'+pane.id,title:member?.title||pane.title,author:member?.author||''},chapters:[],active_chapter:null,care_path:[unit],sheet_options:{},available_layers:[unit.type]}
}
function corpusBookStack(runtime,member){
  const stack=runtime.data.stacks?.[memberId(member)];if(!stack)return null
  const origin=corpusSavedOrigin(runtime,member),routePanes=corpusRouteBookPanes(runtime,member)
  const saved=origin?corpusSheetStack(runtime,origin,member).care_path[0]:null
  const routed=routePanes.map(pane=>({...corpusSheetStack(runtime,pane).care_path[0],corpus_source_pane:pane.id}))
  const replaced=new Set(routed.map(unit=>unit.id))
  const path=[...arr(stack.care_path).filter(p=>!(saved&&p.type==='WB')&&!replaced.has(p.id)),...routed,...(saved?[saved]:[])]
  path.sort((a,b)=>LAYERS.indexOf(a.type)-LAYERS.indexOf(b.type))
  return {...stack,care_path:path}
}
function corpusNativeHost(runtime,member,focused=false){
  const id=memberId(member),ready=runtime.data.stacks?.[id]
  const error=runtime.data.field.member_load_errors?.[id]
  if(!ready&&error&&!corpusSavedOrigin(runtime,member))return `<div class="ct-native-book ct-empty"><strong>${esc(member.title)}</strong><p>${esc(error)}</p><button type="button" class="control" data-corpus-retry="${esc(id)}">Retry opening panes</button></div>`
  if(!ready&&(error||runtime.state.corpusBooksFolded)&&corpusSavedOrigin(runtime,member))return `${error?`<div class="ct-empty">${esc(error)} <button type="button" class="control" data-corpus-retry="${esc(id)}">Retry</button></div>`:''}<div class="ct-native-book" data-native-input="${esc(id)}" aria-label="${esc(member.title)} saved whole book"></div>`
  return `<div class="ct-native-book ${focused?'ct-native-focused':''}" data-native-book="${esc(id)}" data-native-deep aria-label="${esc(member.title)} Library panes">${ready?'':`<div class="ct-empty"><strong>${esc(member.title)}</strong><p>Opening Library panes…</p><button type="button" class="control" data-corpus-retry="${esc(id)}">Retry opening panes</button></div>`}</div>`
}
function corpusInputs(runtime){
  // Read recorded whole books through intermediate corpora; an older nested
  // corpus without preserved ancestry remains a readable source itself. The
  // catalogue's flattened member list is not evidence of historical input.
  const all=allFieldPanes(runtime),index=new Map(all.map(p=>[p.id,p])),seen=new Set(),sources=[]
  const walk=id=>{
    if(seen.has(id))return;seen.add(id);const pane=index.get(id);if(!pane)return
    if(pane.role==='origin'&&pane.layer==='WB'){if(!pane.overview_metadata_only)sources.push(pane);return}
    const parents=arr(pane.origin_pane_ids).filter(parent=>index.has(parent))
    if(pane.role==='origin'&&pane.layer==='CB'&&!parents.length){if(!pane.overview_metadata_only)sources.push(pane);return}
    parents.forEach(walk)
  }
  corpusOutputs(runtime).forEach(p=>arr(p.origin_pane_ids).forEach(walk))
  if(!sources.length)all.filter(p=>p.role==='origin'&&!p.overview_metadata_only&&['WB','CB'].includes(p.layer)).forEach(p=>sources.push(p))
  const members=arr(runtime.data.field.members),groups=new Map()
  sources.forEach(pane=>{const key=pane.unit_id||pane.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(pane)})
  for(const pane of all)if(pane.role==='origin'&&!pane.overview_metadata_only&&groups.has(pane.unit_id)&&!groups.get(pane.unit_id).some(row=>row.id===pane.id))groups.get(pane.unit_id).push(pane)
  return [...groups.values()].map(panes=>{
    const first=panes[0],member=members.find(m=>memberId(m)===first.work_id||arr(m.source_unit_ids).includes(first.unit_id)),id=member?memberId(member):'input:'+first.unit_id
    const selected=panes.find(p=>p.id===runtime.state.corpusEditions?.[id])||first
    return {...(member||{}),id,work_id:member?memberId(member):'',title:(selected.title||member?.title||selected.work_title||selected.unit_id).replaceAll('_',' '),corpusOrigin:selected,corpusVariants:panes,corpusMember:member||null}
  })
}
// Catalogue membership opens current Library books without claiming that their
// present readings were used by a saved corpus. Exact ancestry stays in corpusInputs.
function corpusReadingRows(runtime){
  const saved=corpusInputs(runtime),represented=new Set(saved.filter(input=>input.corpusMember).map(memberId))
  const current=arr(runtime.data.field.members).filter(member=>memberId(member)&&!represented.has(memberId(member))).map(member=>({...member,title:String(member.title||memberId(member)).replaceAll('_',' '),corpusOrigin:null,corpusVariants:[],corpusMember:member}))
  return [...saved,...current]
}
function corpusMemberMenu(runtime){
  return `<details class="ct-members"><summary>Explore member books · ${arr(runtime.data.field.members).length}</summary><p>Open a book’s available Source, CH, CL, MC and WB layers here.</p><div>${arr(runtime.data.field.members).map(member=>`<button type="button" class="control" data-corpus-book="${esc(memberId(member))}">${esc(member.title.replaceAll('_',' '))} ↗</button>`).join('')}</div></details>`
}
function corpusRows(runtime){
  const s=corpusState(runtime)
  return corpusRouteOrderedInputs(runtime).map((member,index)=>{
    const id=memberId(member),open=!!s.corpusOpen[id],origin=member.corpusOrigin,origins=member.corpusVariants
    return `<article class="ct-row" data-corpus-row="${esc(id)}"><div class="ct-track-caption"><button type="button" class="ct-book-toggle" data-corpus-toggle="${esc(id)}" aria-expanded="${open}" aria-controls="corpus-wb-${index}"><span class="ct-number">${String(index+1).padStart(2,'0')}</span><span class="ct-book-copy"><strong>${esc(member.title)}</strong><small>${origin?esc(origin.layer)+' · '+(origin.layer==='CB'?'Saved corpus input':esc(member.author||'Whole book')):'Current Library reading'}</small></span><span class="ct-fold-mark" aria-hidden="true">${open?'−':'+'}</span></button>${member.corpusMember?`<button type="button" class="control" data-corpus-book="${esc(id)}" title="Expand this book’s Library panes">Expand book ↗</button>`:''}</div><div id="corpus-wb-${index}" ${open?'':'hidden'}>${open?`${origins.length>1?`<div class="ct-toolbar"><label>Saved edition <select data-corpus-edition="${esc(id)}">${origins.map(p=>`<option value="${esc(p.id)}" ${p.id===origin.id?'selected':''}>${esc(p.version||p.title||p.id)}</option>`).join('')}</select></label></div>`:''}${member.corpusMember?corpusNativeHost(runtime,member):`<div class="ct-native-book" data-native-input="${esc(id)}" aria-label="${esc(member.title)} saved reading"></div>`}`:''}</div></article>`
  }).join('')+corpusRouteExtrasHTML(runtime)+(corpusReadingRows(runtime).length?'':'<div class="ct-empty">No member books are available for this corpus yet.</div>')+corpusMemberMenu(runtime)
}
function corpusOutputCaption(runtime){
  const outputs=corpusOutputs(runtime),selected=corpusOutput(runtime)
  return `<div class="ct-output-caption"><strong>Corpus reading</strong>${outputs.length>1?`<select data-corpus-output aria-label="Corpus sheet">${outputs.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?.id?'selected':''}>${esc(p.layer+' · '+(p.title||p.unit_id))}</option>`).join('')}</select>`:''}<button class="control" type="button" data-corpus-reading="@corpus" aria-label="Expand corpus reading">↗</button></div>`
}
// A corpus is the same reading operation one scale higher. Slots describe the
// navigation role; every sheet keeps its real WB/CL/MC/CB identity and edition.
function corpusBuildLevel(pane){return Number(pane?.macro_level||pane?.mc_level||CORPUS_BOOK_READER.mcLevel?.(pane)||0)}
function corpusBuildModel(runtime){
  const all=allFieldPanes(runtime),index=new Map(all.map(pane=>[pane.id,pane])),state=runtime.state,chosen=state.corpusBuildSheets||{}
  const finals=arr(runtime.data.field.panes).filter(pane=>pane.role!=='origin'&&pane.layer==='CB'&&!pane.overview_metadata_only)
  const requested=index.get(chosen.CB||state.corpusOutput);if(requested?.layer==='CB'&&!requested.overview_metadata_only&&!finals.some(pane=>pane.id===requested.id))finals.push(requested)
  const final=finals.find(pane=>pane.id===chosen.CB)||finals.find(pane=>pane.id===state.corpusOutput)||finals[0]
  const ancestry=new Set(),walk=id=>{if(ancestry.has(id))return;ancestry.add(id);arr(index.get(id)?.origin_pane_ids).forEach(walk)}
  if(final)walk(final.id)
  const feeds=(pane,source)=>{const seen=new Set(),visit=id=>{if(id===source)return true;if(seen.has(id))return false;seen.add(id);return arr(index.get(id)?.origin_pane_ids).some(visit)};return Boolean(pane&&source&&visit(pane.id))}
  const recorded=corpusInputs(runtime),bound=recorded.filter(row=>arr(row.corpusVariants).some(pane=>ancestry.has(pane.id)))
  const rows=(bound.length?bound:recorded).map(row=>{
    const variants=arr(row.corpusVariants),exact=variants.find(pane=>pane.id===state.corpusEditions?.[memberId(row)])||variants.find(pane=>ancestry.has(pane.id))||row.corpusOrigin
    return {...row,corpusOrigin:exact}
  })
  const stages=all.filter(pane=>['CL','MC'].includes(pane.layer)&&!pane.overview_metadata_only&&(pane.role==='corpus_stage'||arr(runtime.data.field.panes).some(output=>output.id===pane.id&&output.role!=='origin'))&&(ancestry.has(pane.id)||pane.corpus_build_pane===final?.id))
  const groups=[]
  if(rows.length)groups.push({slot:'CORPUS_INPUT',label:'Whole book',panes:rows.map(row=>row.corpusOrigin),rows})
  if(stages.some(pane=>pane.layer==='CL'))groups.push({slot:'CL',label:'CL sheet',panes:stages.filter(pane=>pane.layer==='CL')})
  for(const level of [...new Set(stages.filter(pane=>pane.layer==='MC').map(corpusBuildLevel))].sort((a,b)=>a-b))groups.push({slot:'MC:'+String(level||'legacy'),label:level?'MC L'+level+' sheet':'MC sheet',panes:stages.filter(pane=>pane.layer==='MC'&&corpusBuildLevel(pane)===level)})
  if(finals.length)groups.push({slot:'CB',label:'CB sheet',panes:finals})
  let previous=null
  for(const group of groups){
    group.selected=group.slot==='CB'?final:group.panes.find(pane=>pane.id===chosen[group.slot])||group.panes.find(pane=>previous&&feeds(pane,previous.id))||group.panes[0]
    previous=group.selected
  }
  return {groups,rows,final,index,feeds}
}
function corpusBuildStack(runtime){
  const model=corpusBuildModel(runtime),options={},path=[]
  for(const group of model.groups){
    options[group.slot]=group.panes.map((pane,index)=>({id:pane.id,unit_id:pane.unit_id,title:pane.title||pane.work_title||pane.unit_id,available:true,slider_label:group.label,slider_stop_label:group.slot==='CORPUS_INPUT'?`${pane.layer} ${String(index+1).padStart(2,'0')}`:group.slot==='CB'?'CB':`${group.label.replace(' sheet','')} ${String(index+1).padStart(2,'0')}`,identity:{title:pane.title||pane.work_title||pane.unit_id,kicker:group.slot==='CORPUS_INPUT'?'Whole book · corpus input':group.label,context:pane.version||''}}))
    const pane=group.selected;if(!pane)continue
    const row=group.rows?.find(row=>row.corpusOrigin.id===pane.id),base=corpusSheetStack(runtime,pane,row).care_path[0]
    const item=item=>({...item,source_pane:pane.id}),unit={...base,reader_slot:group.slot,reader_option_id:pane.id,corpus_source_pane:pane.id,pane_accent:group.slot==='CORPUS_INPUT'?color('WB'):base.pane_accent,items:arr(base.items).map(item),sections:arr(base.sections).map(section=>({...section,items:arr(section.items).map(item)}))}
    if(pane.layer==='MC'&&corpusBuildLevel(pane))unit.mc_level=corpusBuildLevel(pane)
    path.push(unit)
  }
  return {work:{id:runtime.data.field.id,title:runtime.data.field.title,author:''},chapters:[],active_chapter:null,care_path:path,sheet_options:options,reader_slots:model.groups.map(group=>group.slot),available_layers:path.map(unit=>unit.type)}
}
function selectCorpusBuildSheet(runtime,scope,{render=true}={}){
  const model=corpusBuildModel(runtime),state=runtime.state,known=model.index.get(scope)
  let group=model.groups.find(group=>group.panes.some(pane=>pane.id===scope))
  if(!group&&known){
    const row=model.rows.find(row=>arr(row.corpusVariants).some(pane=>pane.id===scope))
    if(row){state.corpusEditions=state.corpusEditions||{};state.corpusEditions[memberId(row)]=scope;group=model.groups.find(group=>group.slot==='CORPUS_INPUT')}
  }
  if(!group)return false
  const choices=state.corpusBuildSheets||(state.corpusBuildSheets={})
  choices[group.slot]=scope
  if(group.slot==='CB'){
    state.corpusOutput=scope
    for(const key of Object.keys(choices))if(key!=='CB')delete choices[key]
    state.corpusEditions={}
  }else{
    const start=model.groups.indexOf(group)
    for(const later of model.groups.slice(start+1))if(later.slot!=='CB')delete choices[later.slot]
    if(group.slot!=='CORPUS_INPUT'){
      const input=model.rows.find(row=>model.feeds(known,row.corpusOrigin.id));if(input)choices.CORPUS_INPUT=input.corpusOrigin.id
    }
  }
  state.corpusFocus=''
  if(render){save(runtime);renderCorpus(runtime)}
  return true
}
function corpusReadingLanguagePane(runtime,native){
  const focused=[...native.root.querySelectorAll('[data-pane]')].find(pane=>pane.dataset.pane===native.focused)
  const unit=arr(native.data?.stack?.care_path).find(unit=>unit.id===native.focused)||(!native.focused?arr(native.data?.stack?.care_path)[0]:null)
  const scope=focused?.dataset.connectionField||unit?.corpus_source_pane
  return allFieldPanes(runtime).find(pane=>pane.id===scope)
}
function installCorpusReadingLanguage(runtime,native){
  native.updateCorpusReadingLanguage=()=>{
    const file=native.root.querySelector('[data-reader-menu-panel="book"]')
    if(!file)return
    file.querySelector('[data-corpus-reading-language]')?.remove()
    const pane=corpusReadingLanguagePane(runtime,native),menu=pane?.reading_languages
    if(!arr(menu?.options).length)return
    file.insertAdjacentHTML('beforeend',`<div class="sheet-version-fields" data-corpus-reading-language><label>Reading language · ${esc(pane.work_title||pane.title||pane.unit_id)}<select data-corpus-language-choice aria-label="Reading language for ${esc(pane.work_title||pane.title||pane.unit_id)}">${menu.options.map(option=>`<option value="${esc(option.id)}"${option.id===menu.selected_id?' selected':''}${option.available===false?' disabled':''}>${esc(option.label)}</option>`).join('')}</select></label></div>`)
    file.querySelector('[data-corpus-language-choice]').onchange=event=>{
      const choice=event.target.value
      if(choice===menu.selected_id||!menu.options.some(option=>option.id===choice&&option.available!==false))return
      runtime.emit?.({type:'corpus_language',source_pane:pane.id,language_id:choice})
    }
  }
  if(native.openReaderMenu!==native.corpusLanguageMenuWrapper){
    const open=native.openReaderMenu
    native.corpusLanguageMenuWrapper=(...args)=>{native.updateCorpusReadingLanguage();return open?.(...args)}
    native.openReaderMenu=native.corpusLanguageMenuWrapper
  }
  native.updateCorpusReadingLanguage()
}
function installCorpusBuildMenus(runtime,host,native){
  native.readerMenuBoundsRoot=runtime.root
  const model=corpusBuildModel(runtime),input=model.groups.find(group=>group.slot==='CORPUS_INPUT')?.selected,row=model.rows.find(row=>row.corpusOrigin.id===input?.id)
  const file=native.root.querySelector('[data-reader-menu-panel="book"]'),navigate=native.root.querySelector('[data-reader-menu-panel="navigate"]')
  file?.querySelector('[data-corpus-build-editions]')?.remove()
  if(file&&arr(row?.corpusVariants).length>1){
    file.insertAdjacentHTML('beforeend',`<label class="desk-menu-label" data-corpus-build-editions>Saved input edition<select aria-label="Saved input edition">${row.corpusVariants.map(pane=>`<option value="${esc(pane.id)}"${pane.id===input.id?' selected':''}>${esc(pane.version||pane.id)}</option>`).join('')}</select></label>`)
    file.querySelector('[data-corpus-build-editions] select').onchange=event=>selectCorpusBuildSheet(runtime,event.target.value)
  }
  navigate?.querySelector('[data-corpus-build-books]')?.remove()
  if(navigate){
    navigate.insertAdjacentHTML('beforeend',`<div data-corpus-build-books><div class="desk-menu-rule"></div><span class="desk-menu-heading">Explore source books</span>${arr(runtime.data.field.members).map(member=>`<button type="button" class="desk-tab" data-expand-corpus-book="${esc(memberId(member))}">${esc(member.title)}</button>`).join('')}</div>`)
    navigate.querySelector('[data-corpus-build-books]').onclick=event=>{const button=event.target.closest('[data-expand-corpus-book]');if(button){native.closeReaderMenu?.();runtime.state.corpusFocus=button.dataset.expandCorpusBook;runtime.state.corpusDepths=runtime.state.corpusDepths||{};runtime.state.corpusDepths[button.dataset.expandCorpusBook]='SOURCE';requestCorpusMember(runtime,button.dataset.expandCorpusBook,runtime.emit);renderCorpus(runtime)}}
  }
}
function corpusOverview(runtime){
  return `<div class="ct-build-viewport" data-corpus-viewport><div class="ct-native-build" data-native-corpus data-native-corpus-build aria-label="${esc(runtime.data.field.title)} corpus build"></div>${corpusRouteExtrasHTML(runtime)}</div>`
}

function corpusFocused(runtime){
  const member=arr(runtime.data.field.members).find(m=>memberId(m)===runtime.state.corpusFocus)
  return `<div class="ct-toolbar"><button type="button" class="control" data-corpus-overview>← Whole books & corpus</button><strong class="ct-focus-title">${esc(member?.title||'Corpus reading')}</strong><span class="ct-hint">${member?'Source → CH → CL → MC → WB':'Read and follow exact routes'}</span></div><div class="ct-reading-window">${member?corpusNativeHost(runtime,member,true):'<div class="ct-native-corpus-focused" data-native-corpus></div>'}</div>`
}
function cleanupCorpusReaders(runtime){
  for(const host of runtime.root.querySelectorAll('[data-native-book],[data-native-input],[data-native-corpus],[data-native-route]')){
    const native=host.shadowRoot&&typeof CORPUS_BOOK_READER!=='undefined'&&CORPUS_BOOK_READER.runtime(host.shadowRoot)
    if(!native)continue
    runtime.corpusNativeMemory=runtime.corpusNativeMemory||{}
    const active=host.shadowRoot.activeElement
    const readings=[...native.root.querySelectorAll('.window-body')].map(body=>({id:body.dataset.readingId||body.closest('[data-pane]')?.dataset.pane,top:body.scrollTop,sections:[...body.querySelectorAll('.care-section')].map(section=>section.open)}))
    const previous=runtime.corpusNativeMemory[native.data.workspace_context],retained=native.data.corpus_build?new Map(arr(previous?.readings).map(row=>[row.id,row])):new Map();readings.forEach(row=>retained.set(row.id,row))
    runtime.corpusNativeMemory[native.data.workspace_context]={controls:native.paneControlState,zoom:{...native.trackZoomState()},focus:active?.dataset?{...active.dataset}:null,readings:[...retained.values()]}
  }
  runtime.corpusLoadObserver?.disconnect();runtime.corpusLoadObserver=null
  for(const cleanup of runtime.nativeCleanups||[])cleanup?.()
  runtime.nativeCleanups=[]
  runtime.corpusReadersMounted=false
}
function mountCorpusReaders(runtime){
  if(typeof CORPUS_BOOK_READER==='undefined')return
  runtime.nativeCleanups=runtime.nativeCleanups||[]
  runtime.corpusReadersMounted=true
  const {root}=runtime
  const mount=(host,stack,pane,member,deep)=>{
    if(!stack||!host.attachShadow)return
    const build=host.hasAttribute?.('data-native-corpus-build')||false
    const work=member?memberId(member):'',origin=pane||null
    const context=build?runtime.data.field.id+'|corpus-build-v1':runtime.data.field.id+'|'+(deep?'panes-v4|'+work+'|'+(pane?.id||'current'):pane?.id||'sheet')
    const hosts=runtime.corpusNativeHosts||(runtime.corpusNativeHosts=new Map()),previous=hosts.get(context)
    // Keep the native runtime and its DOM through field reruns. Its own update
    // path preserves Outline, selections, menus and every pane's scroll state.
    if(previous&&previous!==host){previous.className=host.className;host.replaceWith(previous);host=previous}
    hosts.set(context,host)
    const shadow=host.shadowRoot||host.attachShadow({mode:'open'}),style=root.ownerDocument.createElement('style')
    style.textContent=CORPUS_BOOK_CSS+CORPUS_ROUTES_NATIVE_CSS+(build?`
.study-desk{height:100%!important;max-height:none!important;min-height:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}.desk-strip{min-height:0}.desk-status{display:none}.corpus-build-tools .desk-title{min-width:0}
`:CORPUS_PANE_FOLDS_CSS+(deep?`
.study-desk{min-height:0!important;grid-template-rows:minmax(0,1fr)!important;isolation:auto;border:0!important;border-radius:0!important;box-shadow:none!important}.desk-toolbar,.desk-status{display:none!important}:host([data-corpus-active]) .desk-toolbar{display:flex!important;position:fixed;top:var(--corpus-toolbar-top);left:var(--corpus-toolbar-left);width:var(--corpus-toolbar-width);z-index:60;margin:0;border-radius:0}.desk-strip{height:100%!important;min-height:0!important;padding:0!important}.window-body{overscroll-behavior-y:auto}.corpus-depth-control{display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:.6rem}.corpus-depth-control select{max-width:8rem;background:var(--desk-paper);color:var(--desk-ink);border:1px solid var(--desk-line);border-radius:6px;padding:.4rem}.desk-window[hidden]{display:none!important}:host([data-corpus-depth=WB]) .desk-window[data-layer=WB]:not(.care-pane-minimized){flex-basis:100%!important;min-width:0!important;max-width:100%;width:100%}`:`
.study-desk{min-height:0!important;display:flex;flex-direction:column;border:0!important;border-radius:0!important}.corpus-sheet-tools{display:none!important}.desk-strip{flex:1;min-height:0!important;height:auto!important;padding:0!important;overflow:hidden;gap:0}.desk-window{flex-basis:100%!important;min-width:0!important;width:100%!important;max-width:none}.desk-window:not(.care-pane-minimized){height:100%!important}.desk-window>.pane-slider{display:none}.window-body{overscroll-behavior:contain}`))

    if(!build)style.textContent+=`.desk-skin{display:none!important}.study-desk{isolation:auto!important}.desk-toolbar,.desk-status{display:none!important}:host([data-corpus-active]) .desk-toolbar{display:flex!important;position:fixed;top:var(--corpus-toolbar-top);left:var(--corpus-toolbar-left);width:var(--corpus-toolbar-width);z-index:60;margin:0;border-radius:0}`
    style.textContent+=`.study-desk .corpus-books-fold{display:inline-flex;align-items:center;justify-content:center;flex:0 0 2rem;width:2rem;min-width:2rem;max-width:2rem;height:2rem;padding:0}.corpus-books-fold svg{width:1rem;height:1rem;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}.study-desk .corpus-depth-control{position:relative;display:inline-flex;align-items:center;gap:.4rem;flex:0 0 8.3rem;width:8.3rem;height:2rem;padding:0 .58rem;white-space:nowrap;cursor:pointer}.corpus-depth-control>span{font-size:.55rem;font-weight:600;letter-spacing:.045em;color:var(--desk-muted);text-transform:uppercase;pointer-events:none}.study-desk .corpus-depth-control select{appearance:none;-webkit-appearance:none;flex:1;min-width:0;max-width:none;width:100%;height:100%;padding:0 1.1rem 0 0;border:0;border-radius:0;background:transparent;color:inherit;box-shadow:none;font:inherit;font-weight:760;cursor:pointer;outline:none}.corpus-depth-control select option{background:var(--desk-paper);color:var(--desk-ink)}.corpus-depth-control>svg{position:absolute;right:.6rem;width:.75rem;height:.75rem;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}.study-desk .corpus-depth-control:focus-within,.study-desk .corpus-books-fold:focus-visible{outline:2px solid #8ca9bd;outline-offset:2px}`
    style.textContent+=`.study-desk .desk-menu-panel .corpus-books-fold{width:100%;max-width:none;min-height:2rem;height:auto;justify-content:flex-start;flex:none;padding:.4rem .55rem}.study-desk .desk-menu-panel .corpus-depth-control{width:100%;height:auto;min-height:2rem;flex:none;padding:.4rem .55rem}.study-desk .desk-menu-panel .corpus-depth-control>span{font-size:.65rem;text-transform:none;letter-spacing:0}.study-desk .desk-menu-panel .corpus-depth-control select{min-height:1.7rem}.study-desk .desk-menu-panel .desk-skin{display:flex!important}`
    if(!shadow.querySelector?.('[data-study-desk]')){
      const desk=root.ownerDocument.createElement('div');desk.className='study-desk';desk.setAttribute('data-study-desk','');desk.tabIndex=0
      shadow.replaceChildren(style,desk)
    }else{const previousStyle=shadow.querySelector('style');if(previousStyle)previousStyle.textContent=style.textContent;else shadow.prepend(style)}
    const scopedOrigins=build?allFieldPanes(runtime).filter(pane=>arr(stack.care_path).some(unit=>unit.corpus_source_pane===pane.id)||corpusRouteNodes(runtime.data.reference).some(node=>node.source_pane===pane.id)):[...(origin?[origin]:[]),...(deep?corpusRouteBookPanes(runtime,member):[])]
    const trigger=(kind,value)=>{
      if(build&&kind==='open_sheet'){selectCorpusBuildSheet(runtime,String(value));return}
      if(build&&kind==='connection_action'){
        const source=allFieldPanes(runtime).find(pane=>pane.id===value?.pane_id),sourceWork=source?.work_id||''
        if(['reference','book_reference'].includes(value?.action))runtime.emit?.({type:'open_reference',reference_id:value.reference_id,work_id:sourceWork,source_pane:value.pane_id||'',corpus_depths:corpusBookDepths(runtime)})
        else if(value?.action==='clear_reference')runtime.emit?.({type:'clear_reference'})
        else if(value?.action==='navigate_route')navigateCorpusRouteHistory(runtime,Number(value.direction))
        else if(value?.action==='select_axiom')runtime.emit?.({type:'selected_axiom',work_id:sourceWork,source_pane:value.pane_id||'',value:{work_id:sourceWork,unit_id:source?.unit_id||'',axiom_id:value.reference_id}})
        return
      }
      if(build&&kind==='clear_reference'){runtime.emit?.({type:'clear_reference'});return}
      if(kind==='open_chapter'||kind==='open_sheet')runtime.emit?.({type:kind,work_id:work,raw_unit_id:kind==='open_chapter'?String(value):'',unit_id:kind==='open_sheet'?String(value):''})
      else if(kind==='open_reference'){
        const saved=scopedOrigins.find(pane=>[...arr(pane.items),...arr(pane.sections).flatMap(s=>arr(s.items))].some(item=>(item.id||item.care_item_id)===value))
        runtime.emit?.({type:'open_reference',work_id:work||saved?.work_id||'',reference_id:String(value),source_pane:saved?.id||'',corpus_depths:corpusBookDepths(runtime)})
      }else if(['bookmark_action','axiom_favourite_action'].includes(kind)){
        const saved=kind==='bookmark_action'?scopedOrigins.find(pane=>(pane.unit_id||pane.id)===value?.care_unit_id):scopedOrigins.find(pane=>[...arr(pane.items),...arr(pane.sections).flatMap(section=>arr(section.items))].some(item=>(item.id||item.care_item_id)===value?.care_item_id))
        if(work||saved)runtime.emit?.({...value,type:kind,work_id:work||saved.work_id||'',source_pane:saved?.id||''})
      }
      else if(deep&&['open_outline_sheet','version_action','connection_action','open_work','open_field','open_archive','book_action','set_route_mode','navigate_route','clear_reference','rate'].includes(kind))runtime.emit?.({type:kind,work_id:work,value})
    }
    const readerData=deep?runtime.data.field.member_reader_data?.[work]||{}:{}
    const scopes=Object.fromEntries(scopedOrigins.flatMap(pane=>[...arr(pane.items),...arr(pane.sections).flatMap(section=>arr(section.items))].map(item=>[item.id||item.care_item_id,pane.id])))
    const unitScopes=Object.fromEntries(scopedOrigins.map(pane=>[pane.unit_id||pane.id,pane.id]))
    const sameField=row=>!row.field_id||row.field_id===runtime.data.field.id
    const bookmarks=arr(runtime.data.field.saved_panes).filter(row=>row.source_pane?sameField(row)&&unitScopes[row.care_unit_id]===row.source_pane:!unitScopes[row.care_unit_id]&&[work,stack.work?.id].includes(row.work_id)).map(row=>({...row,work_id:stack.work?.id}))
    const favourites=[...arr(runtime.data.field.favourite_axiom_ids).filter(id=>!scopes[id]),...arr(runtime.data.field.saved_axioms).filter(row=>sameField(row)&&row.source_pane&&scopes[row.care_item_id]===row.source_pane).map(row=>row.care_item_id)]
    const data={mode:'workspace',hide_xa:true,outline_available:deep,connection_options:[],build_versions:[],...readerData,stack,corpus_build:build,corpus_sheet:!deep,corpus_caption:member?(origin?'Whole book · saved source':'Current Library reading'):pane?.layer+' · saved corpus',workspace_managed:true,workspace_context:context,viewer_scopes:scopes,bookmarks,favourite_axiom_ids:[...new Set(favourites)],saved_focus:null}
    if(build){data.corpus_caption='Whole books → corpus';data.corpus_route_panes=scopedOrigins;if(runtime.data.reference)data.connection={id:runtime.data.field.id,field:'corpus',bundle:runtime.data.field,reference:runtime.data.reference,route_history:corpusRouteHistoryFlags(runtime)}}
    const savedFocus=runtime.data.field.saved_focus||runtime.corpusSavedFocus
    const focusMatches=savedFocus&&(savedFocus.source_pane?scopedOrigins.some(pane=>pane.id===savedFocus.source_pane):savedFocus.work_id===work)
    if(focusMatches)data.saved_focus={...savedFocus,work_id:stack.work.id,unit_id:savedFocus.unit_id||scopedOrigins.find(pane=>pane.id===savedFocus.source_pane)?.unit_id}
    const selection=(kind,value)=>{if(kind==='selected_axiom'){const scope=data.viewer_scopes[value?.axiom_id||value?.passage_id]||'',source=scopedOrigins.find(pane=>pane.id===scope),sourceWork=work||source?.work_id||'';runtime.emit?.({type:kind,work_id:sourceWork,value:{...value,work_id:sourceWork},source_pane:scope})}}
    runtime.nativeCleanups.push(CORPUS_BOOK_READER.mount({parentElement:shadow,data,setStateValue:selection,setTriggerValue:trigger}))
    const native=CORPUS_BOOK_READER.runtime(shadow)
    if(native){
      const memory=runtime.corpusNativeMemory?.[context]
      if(memory?.controls){native.paneControlState=memory.controls;CORPUS_BOOK_READER.restoreControls(shadow)}
      if(deep&&memory?.zoom){Object.assign(native.trackZoomState(),memory.zoom);native.applyTrackZoom()}
      if(deep)installCorpusToolbar(runtime,host,native)
      if(build)installCorpusBuildMenus(runtime,host,native)
      installCorpusReadingLanguage(runtime,native)
      installCorpusRouteControls(runtime,host,native)
      if(!build){const folds=installCorpusPaneFolds(runtime,host,native,(target,detail)=>updateCorpusFoldLayout(runtime,target,detail));runtime.nativeCleanups.push(folds.cleanup)}
      installCorpusBookFoldControl(runtime,host,native)
      if(!host.hasAttribute('data-native-corpus')&&runtime.view.ResizeObserver){const toolbarObserver=new runtime.view.ResizeObserver(()=>{if(host.hasAttribute('data-corpus-active'))updateCorpusToolbar(runtime)});const bar=native.root.querySelector('.desk-toolbar');if(bar)toolbarObserver.observe(bar);runtime.nativeCleanups.push(()=>toolbarObserver.disconnect())}
      const onScroll=()=>{if(runtime.corpusRouteFrame)return;runtime.corpusRouteFrame=runtime.view.requestAnimationFrame(()=>{runtime.corpusRouteFrame=null;drawCorpusRouteThreads(runtime)})}
      shadow.addEventListener('scroll',onScroll,true);runtime.nativeCleanups.push(()=>shadow.removeEventListener('scroll',onScroll,true))
      if(!deep){native.focused=stack.care_path[0]?.id||'';native.paintFocus();native.setTrackZoom('read')}
      if(memory?.readings){
        // Detaching a book while the surrounding field rerenders can clamp its
        // scroll position to zero. Restore from before that detach, by sheet.
        for(const body of native.root.querySelectorAll('.window-body')){
          const position=memory.readings.find(saved=>saved.id===(body.dataset.readingId||body.closest('[data-pane]')?.dataset.pane))
          if(position){body.querySelectorAll('.care-section').forEach((section,index)=>{section.open=position.sections[index]??section.open});body.scrollTop=position.top}
        }
      }
      if(focusMatches&&savedFocus.care_item_id&&native.savedFieldAxiomFocus!==savedFocus.token){
        const card=[...native.root.querySelectorAll('[data-select-axiom]')].find(card=>card.dataset.selectAxiom===savedFocus.care_item_id&&(!savedFocus.source_pane||scopes[savedFocus.care_item_id]===savedFocus.source_pane))
        if(card){const section=card.closest('details');if(section)section.open=true;native.savedFieldAxiomFocus=savedFocus.token;native.selectAxiom?.(card);card.scrollIntoView?.({block:'center',inline:'nearest'})}
      }
      if(memory?.focus){const keys=Object.entries(memory.focus);if(keys.length)[...shadow.querySelectorAll('button,input,select,summary')].find(el=>keys.every(([key,value])=>el.dataset[key]===value))?.focus({preventScroll:true});memory.focus=null}
    }
  }
  root.querySelectorAll('[data-native-input]').forEach(host=>{
    const input=corpusInputs(runtime).find(m=>memberId(m)===host.dataset.nativeInput)
    if(input)mount(host,corpusSheetStack(runtime,input.corpusOrigin,input.corpusMember?input:null),input.corpusOrigin,input.corpusMember,false)
  })
  root.querySelectorAll('[data-native-deep]').forEach(host=>{
    const member=arr(runtime.data.field.members).find(m=>memberId(m)===host.dataset.nativeBook)
    if(member)mount(host,corpusBookStack(runtime,member),corpusSavedOrigin(runtime,member),member,true)
  })
  root.querySelectorAll('[data-native-route]').forEach(host=>{const pane=corpusRouteExtraPanes(runtime).find(p=>p.id===host.dataset.nativeRoute);if(pane)mount(host,corpusSheetStack(runtime,pane),pane,null,false)})
  const output=corpusOutput(runtime)
  root.querySelectorAll('[data-native-corpus]').forEach(host=>{
    if(host.hasAttribute?.('data-native-corpus-build')){const stack=corpusBuildStack(runtime);if(stack.care_path.length)mount(host,stack,null,null,false);else host.innerHTML='<div class="ct-empty">No saved corpus reading is available.</div>'}
    else if(output)mount(host,corpusSheetStack(runtime,output),output,null,false)
    else host.innerHTML='<div class="ct-empty">No completed corpus sheet is available yet. The saved whole-book readings remain available alongside.</div>'
  })
}
// Hydrate only rows near the viewport, in bounded batches; the Library renderer
// and each book's saved reading positions remain independent.
function requestCorpusMembers(runtime,ids,emit){
  const pending=runtime.pendingCorpusMembers||(runtime.pendingCorpusMembers=new Set())
  Object.keys(runtime.data.stacks||{}).forEach(id=>pending.delete(id))
  Object.keys(runtime.data.field.member_load_errors||{}).forEach(id=>pending.delete(id))
  if(pending.size)return
  const registered=new Set(arr(runtime.data.field.members).map(memberId))
  const needed=[...new Set(ids)].filter(id=>registered.has(id)&&!runtime.data.stacks?.[id]&&!runtime.data.field.member_load_errors?.[id]).slice(0,3)
  if(!needed.length)return
  needed.forEach(id=>pending.add(id));emit?.({type:'load_members',work_ids:needed})
}
function observeCorpusBooks(runtime){
  runtime.corpusLoadObserver?.disconnect();runtime.corpusLoadObserver=null
  const viewport=runtime.root.querySelector('[data-corpus-viewport]')
  if(!viewport)return
  const hosts=[...runtime.root.querySelectorAll('[data-native-deep]')]
  const request=entries=>requestCorpusMembers(runtime,entries.filter(entry=>entry.isIntersecting).map(entry=>entry.target.dataset.nativeBook),runtime.emit)
  if(runtime.view.IntersectionObserver){
    runtime.corpusLoadObserver=new runtime.view.IntersectionObserver(request,{root:viewport,rootMargin:'180px 0px',threshold:0})
    hosts.forEach(host=>runtime.corpusLoadObserver.observe(host))
  }else{
    const bounds=viewport.getBoundingClientRect()
    request(hosts.map(target=>{const box=target.getBoundingClientRect();return {target,isIntersecting:box.bottom>=bounds.top-180&&box.top<=bounds.bottom+180}}))
  }
}
function fitCorpusTracks(runtime){
  if(!isCorpusTracks(runtime))return
  const viewport=runtime.root.querySelector('[data-corpus-viewport]'),available=viewport?.clientHeight||runtime.root.clientHeight-160
  const height=Math.max(320,available-36)
  runtime.root.style.setProperty('--corpus-reader-height',height+'px')
  runtime.root.style.setProperty('--corpus-output-height',height+'px')
  runtime.corpusEffectiveZoom=1
  updateCorpusToolbar(runtime)
}
function renderCorpus(runtime){
  cleanupCorpusReaders(runtime)
  const {root,data}=runtime,s=corpusState(runtime)
  prepareCorpusRoutes(runtime)
  if(s.corpusFocus&&s.corpusFocus!=='@corpus'&&!arr(data.field.members).some(m=>memberId(m)===s.corpusFocus))s.corpusFocus=''
  root.innerHTML=`<div class="ct-shell"><main class="ct-main">${s.corpusFocus&&s.corpusFocus!=='@corpus'?corpusFocused(runtime):corpusOverview(runtime)}</main></div>`

  const viewport=root.querySelector('[data-corpus-viewport]');if(viewport)viewport.scrollTop=s.corpusScroll||0
  fitCorpusTracks(runtime);mountCorpusReaders(runtime);applyCorpusDepth(runtime);updateCorpusToolbar(runtime);queueCorpusRouteLayout(runtime);observeCorpusBooks(runtime)
  if(viewport&&runtime.corpusScrollTo){const row=[...root.querySelectorAll('[data-corpus-row],[data-corpus-route-row]')].find(el=>el.dataset.corpusRow===runtime.corpusScrollTo||'saved:'+el.dataset.corpusRouteRow===runtime.corpusScrollTo);if(row){viewport.scrollTop+=row.getBoundingClientRect().top-viewport.getBoundingClientRect().top-corpusViewportInset(runtime,viewport);s.corpusScroll=viewport.scrollTop;runtime.corpusScrollTo='';updateCorpusToolbar(runtime)}}
}
function corpusBookDepth(runtime,id){return runtime.state.corpusDepths?.[id]||runtime.state.corpusDepth||'WB'}
function corpusSharedDepth(runtime){
  const values=new Set(corpusReadingRows(runtime).filter(input=>input.corpusMember).map(input=>corpusBookDepth(runtime,memberId(input))))
  return values.size>1?'mixed':[...values][0]||runtime.state.corpusDepth||'WB'
}
function applyCorpusDepth(runtime){
  runtime.root.dataset.corpusDepth=runtime.state.corpusDepth||'WB'
  const shared=corpusSharedDepth(runtime)
  for(const host of runtime.root.querySelectorAll('[data-native-deep]')){
    const value=corpusBookDepth(runtime,host.dataset.nativeBook),depth=LAYERS.indexOf(value)
    host.dataset.corpusDepth=value
    const native=host.shadowRoot&&CORPUS_BOOK_READER.runtime(host.shadowRoot);if(!native)continue
    const panes=[...host.shadowRoot.querySelectorAll('.desk-window[data-pane]')]
    for(const pane of panes){
      const layer=pane.dataset.layer||'SOURCE',rank=LAYERS.indexOf(layer)
      if(rank>=0)pane.hidden=rank<depth
    }
    // A missing WB never silently reveals a CH/source pane while Show says WB.
    const empty=host.shadowRoot.querySelector('[data-corpus-depth-empty]'),strip=host.shadowRoot.querySelector('[data-strip]')
    const readable=panes.some(pane=>LAYERS.includes(pane.dataset.layer||'SOURCE')&&!pane.hidden)
    if(readable)empty?.remove?.()
    else if(strip){
      const message=`No ${value==='WB'?'WB reading':'reading at '+value+' or above'} is available for this book. Choose an earlier layer in Show.`
      if(empty)empty.textContent=message
      else strip.insertAdjacentHTML('beforeend',`<div class="ct-empty" data-corpus-depth-empty role="status">${esc(message)}</div>`)
    }
    const select=host.shadowRoot.querySelector('[data-corpus-depth]');if(select)select.value=shared
    native.queueTrackZoom?.();native.corpusPaneFolds?.refresh()
  }
}
function corpusBookDepths(runtime){return Object.fromEntries(corpusReadingRows(runtime).filter(input=>input.corpusMember).map(input=>[memberId(input),corpusBookDepth(runtime,memberId(input))]))}
function changeCorpusBookDepth(runtime,host,value){
  if(!LAYERS.includes(value))return
  runtime.state.corpusDepths=runtime.state.corpusDepths||{};runtime.state.corpusDepths[host.dataset.nativeBook]=value
  applyCorpusDepth(runtime);updateCorpusToolbar(runtime);save(runtime)
  if(runtime.data.reference&&!runtime.corpusRouteNavigating)runtime.emit?.({type:'corpus_depth',work_id:host.dataset.nativeBook,layer:value})
}
function changeCorpusDepth(runtime,value){
  if(!LAYERS.includes(value))return
  runtime.state.corpusDepth=value;runtime.state.corpusDepths={}
  applyCorpusDepth(runtime);updateCorpusToolbar(runtime);save(runtime)
  if(runtime.data.reference&&!runtime.corpusRouteNavigating)runtime.emit?.({type:'corpus_depth',scope:'corpus',layer:value})
}
function installCorpusToolbar(runtime,host,native){
  native.readerMenuBoundsRoot=runtime.root
  const toolbar=host.shadowRoot.querySelector('[data-reader-menu-panel="view"]')
  if(toolbar&&!toolbar.querySelector('[data-corpus-depth]')){
    toolbar.insertAdjacentHTML('afterbegin',`<span class="desk-menu-heading">Corpus books</span><label class="desk-tab corpus-depth-control" title="Show layers for all corpus books"><span>Layers shown</span><select data-corpus-depth aria-label="Layers shown across corpus books"><option value="mixed" disabled>Mixed</option>${[...LAYERS].reverse().map(layer=>`<option value="${layer}">${layer==='WB'?'WB':layer+' → WB'}</option>`).join('')}</select><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></label>`)
  }
  const select=toolbar?.querySelector('[data-corpus-depth]')
  if(select)select.onchange=()=>changeCorpusDepth(runtime,select.value)
  if(!native.corpusFocusInstalled){
    const focus=native.focus
    native.focus=id=>{const pane=[...native.root.querySelectorAll('.desk-window[data-pane]')].find(p=>p.dataset.pane===id),layer=pane?.dataset.layer||'SOURCE';if(pane?.hidden&&LAYERS.includes(layer))changeCorpusBookDepth(runtime,host,layer);return focus(id)}
    native.corpusFocusInstalled=true
  }
  if(!native.corpusViewInstalled){
    // Switching view or receiving a later Outline sheet may replace the panes.
    for(const key of ['setReaderView','applyOutline'])if(native[key]){const render=native[key];native[key]=(...args)=>{const result=render(...args);applyCorpusDepth(runtime);updateCorpusToolbar(runtime);return result}}
    native.corpusViewInstalled=true
  }
  native.root.onclick=event=>{
    if(event.target.closest('[data-skin-value],[data-text-size]'))for(const other of runtime.root.querySelectorAll('[data-native-deep],[data-native-corpus]')){
      const reader=other.shadowRoot&&CORPUS_BOOK_READER.runtime(other.shadowRoot)
      if(reader&&reader!==native){reader.skin=native.skin;reader.textScaleIndex=native.textScaleIndex;reader.applySkin();reader.applyTextScale()}
    }
    positionCorpusMenus(runtime,native)
  }
  applyCorpusDepth(runtime)
  if(!native.corpusInitialFocus){native.corpusInitialFocus=true;const wb=[...native.root.querySelectorAll('[data-pane]')].find(p=>p.dataset.layer==='WB');if(wb)native.focus(wb.dataset.pane)}
}
function positionCorpusMenus(runtime,native){
  if(!native)return
  const bounds=runtime.root.getBoundingClientRect()
  native.positionReaderMenu?.()
  for(const [key,size] of [['buildVersionMenu',340],['sheetVersionPopover',360],['bookmarkMenu',360],['discoveryPopover',416]]){
    const popup=native[key];if(!popup?.anchor||!popup.element)continue
    const anchor=popup.anchor.getBoundingClientRect(),parent=popup.anchor.closest('.desk-menu-panel'),panel=parent?.getBoundingClientRect(),width=Math.min(size,bounds.width-16)
    const right=panel?.right+6,left=panel?.left-width-6,beside=panel?(right+width<=bounds.right-8?right:left>=bounds.left+8?left:null):null
    popup.element.style.maxHeight=Math.max(80,bounds.height-16)+'px'
    const height=popup.element.offsetHeight,top=Math.max(bounds.top+8,Math.min(beside!==null?anchor.top:panel?.bottom+7||anchor.bottom+7,bounds.bottom-height-8))
    Object.assign(popup.element.style,{position:'fixed',zIndex:'85',width:width+'px',maxWidth:'none',left:(beside??Math.max(bounds.left+8,Math.min(bounds.right-width-8,anchor.right-width)))+'px',top:top+'px',maxHeight:Math.max(80,bounds.bottom-top-8)+'px'})
  }
}
function corpusViewportInset(runtime,viewport){return parseFloat(runtime.view.getComputedStyle?.(viewport)?.paddingTop)||0}
function updateCorpusToolbar(runtime){
  const slot=runtime.root.querySelector('[data-corpus-toolbar]'),viewport=runtime.root.querySelector('[data-corpus-viewport]')
  if(!slot||!viewport)return
  const bounds=viewport.getBoundingClientRect(),hosts=[...runtime.root.querySelectorAll('[data-native-deep],[data-native-input],[data-native-route]')].filter(host=>host.shadowRoot?.querySelector('[data-study-desk]'))
  const target=hosts.find(host=>{const r=host.getBoundingClientRect();return r.bottom>bounds.top+corpusViewportInset(runtime,viewport)+1})||hosts.at(-1)
  runtime.root.dataset.corpusDepth=target?.dataset.corpusDepth||'WB'
  const rect=slot.getBoundingClientRect(),footer=runtime.root.querySelector('[data-corpus-status]')?.getBoundingClientRect()
  for(const host of hosts){
    const native=CORPUS_BOOK_READER.runtime(host.shadowRoot)
    if(host!==target&&host.hasAttribute('data-corpus-active')){native?.closeReaderMenu?.();native?.closeBuildVersionMenu?.();native?.closeSheetVersionMenu?.();native?.closeBookmarkMenu?.();native?.closeConnectionDiscovery?.()}
    host.toggleAttribute('data-corpus-active',host===target)
    host.style.setProperty('--corpus-toolbar-top',rect.top+'px');host.style.setProperty('--corpus-toolbar-left',rect.left+'px');host.style.setProperty('--corpus-toolbar-width',rect.width+'px');host.style.setProperty('--corpus-status-top',(footer?.top||bounds.bottom)+'px')
    if(host===target&&native){const panes=[...native.root.querySelectorAll('.desk-window[data-pane]')],focused=panes.find(p=>p.dataset.pane===native.focused);if(focused?.hidden){const visible=panes.find(p=>!p.hidden);if(visible)native.focus(visible.dataset.pane)}}
  }
  const toolbar=target?.shadowRoot.querySelector('.desk-toolbar')
  if(toolbar){
    const height=toolbar.getBoundingClientRect().height
    if(height>0&&Math.abs(slot.clientHeight-height)>1){
      // A newly active title may wrap. Keep that track at the same vertical
      // position as its shared toolbar changes height, without recursive fits.
      const before=target.getBoundingClientRect().top-bounds.top
      slot.style.height=height+'px'
      const readingHeight=Math.max(320,viewport.clientHeight-36)
      runtime.root.style.setProperty('--corpus-reader-height',readingHeight+'px');runtime.root.style.setProperty('--corpus-output-height',readingHeight+'px')
      viewport.scrollTop+=target.getBoundingClientRect().top-viewport.getBoundingClientRect().top-before
    }
  }
  if(target)positionCorpusMenus(runtime,CORPUS_BOOK_READER.runtime(target.shadowRoot))
}

function updateCorpusFoldLayout(runtime,host,detail){
  const wasFolded=host.hasAttribute('data-corpus-fold-compact')
  host.toggleAttribute('data-corpus-fold-compact',detail.allFolded)
  host.style.height=detail.allFolded?detail.titleHeight+'px':'';host.style.minHeight=detail.allFolded?'0':''
  const dock=host.closest('[data-corpus-dock]');if(dock)dock.style.height=detail.allFolded?detail.titleHeight+'px':''
  if(wasFolded&&!detail.allFolded&&host.dataset.nativeInput){
    const work=host.dataset.nativeInput,input=corpusInputs(runtime).find(member=>memberId(member)===work),origin=input?.corpusOrigin
    if(origin){const key=runtime.data.field.id+'|panes-v4|'+work+'|'+origin.id+'|'+(origin.unit_id||origin.id);(runtime.state.corpusPaneFolds||(runtime.state.corpusPaneFolds={}))[key]=false}
    requestCorpusMembers(runtime,[work],runtime.emit)
  }
  updateCorpusToolbar(runtime);queueCorpusFoldRouteLayout(runtime,host,wasFolded&&!detail.allFolded);save(runtime)
}
function setCorpusBooksFolded(runtime,folded){
  runtime.state.corpusBooksFolded=folded
  runtime.corpusRoutePending=null
  const states=runtime.state.corpusPaneFolds||(runtime.state.corpusPaneFolds={}),dockPrefixes=corpusOutputs(runtime).map(pane=>runtime.data.field.id+'|'+pane.id+'|')
  for(const key of Object.keys(states))if(!dockPrefixes.some(prefix=>key.startsWith(prefix)))states[key]=folded
  for(const host of runtime.root.querySelectorAll('[data-native-deep],[data-native-input],[data-native-route]')){
    const native=host.shadowRoot&&CORPUS_BOOK_READER.runtime(host.shadowRoot)
    native?.corpusPaneFolds?.setAll(folded)
    const button=native?.root.querySelector('[data-corpus-books-fold]');if(button)paintCorpusBookFoldControl(runtime,button)
  }
  updateCorpusToolbar(runtime);drawCorpusRouteThreads(runtime);save(runtime)
  renderCorpus(runtime)
}
function paintCorpusBookFoldControl(runtime,button){
  const folded=Boolean(runtime.state.corpusBooksFolded)
  button.innerHTML=`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${folded?'m6 6 4-4 4 4M4 10h12m-10 4 4 4 4-4':'m6 3 4 4 4-4M4 10h12m-10 7 4-4 4 4'}"/></svg><span>${folded?'Restore book panes':'Fold book panes'}</span>`
  button.setAttribute('aria-label',folded?'Restore all book panes':'Fold all book panes to title strips')
  button.setAttribute('aria-pressed',String(folded))
  button.title=folded?'Restore book readings; keep the corpus pane as it is':'Fold book panes to title strips; keep the corpus pane open'
}
function installCorpusBookFoldControl(runtime,host,native){
  if(host.hasAttribute('data-native-corpus'))return
  const toolbar=native.root.querySelector('[data-reader-menu-panel="view"]');if(!toolbar)return
  let button=toolbar.querySelector('[data-corpus-books-fold]')
  if(!button){button=native.root.ownerDocument.createElement('button');button.type='button';button.setAttribute('data-corpus-books-fold','');toolbar.append(button)}
  button.className='desk-tab corpus-books-fold'
  paintCorpusBookFoldControl(runtime,button)
  button.onclick=event=>{event.preventDefault();event.stopPropagation();setCorpusBooksFolded(runtime,!runtime.state.corpusBooksFolded)}
}

function trackZoomValue(value,fit){return value==='fit'||value===undefined?fit:Math.max(.08,Math.min(1.3,Number(value)||fit))}
function corpusFeedsOutput(runtime,origins,output){
  const ids=new Set(origins.map(p=>p.id)),index=new Map(allFieldPanes(runtime).map(p=>[p.id,p])),seen=new Set()
  const visit=id=>{if(ids.has(id))return true;if(seen.has(id))return false;seen.add(id);return arr(index.get(id)?.origin_pane_ids).some(visit)}
  return arr(output?.origin_pane_ids).some(visit)||arr(runtime.data.field.routes).some(edge=>origins.some(p=>edge.from_pane?edge.from_pane===p.id:edge.from===p.unit_id)&&(edge.to_pane?edge.to_pane===output?.id:edge.to===output?.unit_id))
}
function drawCorpusWires(runtime){
  const root=runtime.root,map=root.querySelector('[data-corpus-map]'),dock=root.querySelector('[data-corpus-dock]'),svg=root.querySelector('[data-corpus-wires]')
  if(!map||!dock||!svg)return
  const bounds=map.getBoundingClientRect(),end=dock.getBoundingClientRect(),paths=[],output=corpusOutput(runtime)
  root.querySelectorAll('[data-corpus-row]').forEach(row=>{
    const member=corpusInputs(runtime).find(m=>memberId(m)===row.dataset.corpusRow);if(!member)return
    const recorded=corpusFeedsOutput(runtime,[member.corpusOrigin],output)
    const r=row.getBoundingClientRect(),x1=r.right-bounds.left,y1=r.top+Math.min(r.height/2,28)-bounds.top,x2=end.left-bounds.left,y2=end.top+Math.min(end.height/2,100)-bounds.top
    paths.push(`<path class="${recorded?'recorded':'membership'}" d="M${x1},${y1} C${x1+22},${y1} ${x2-22},${y2} ${x2},${y2}"/><circle cx="${x1}" cy="${y1}" r="2"/>`)
  })
  svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=paths.join('')
}
function requestCorpusMember(runtime,id,emit){
  if(!id||id==='@corpus'||!arr(runtime.data.field.members).some(member=>memberId(member)===id))return
  const pending=runtime.pendingCorpusMembers||(runtime.pendingCorpusMembers=new Set())
  if(runtime.data.stacks?.[id]){pending.delete(id);return}
  if(pending.has(id))return
  pending.add(id);emit({type:'load_member',work_id:id})
}
function onCorpusClick(runtime,d,emit,repaint){
  if(!isCorpusTracks(runtime))return false
  const s=corpusState(runtime)
  if('corpusToggle'in d){s.corpusOpen[d.corpusToggle]=!s.corpusOpen[d.corpusToggle];repaint();return true}
  if('corpusOpenAll'in d){s.corpusOpen=Object.fromEntries(corpusReadingRows(runtime).map(member=>[memberId(member),true]));repaint();return true}
  if('corpusFoldAll'in d){s.corpusOpen=Object.fromEntries(corpusReadingRows(runtime).map(member=>[memberId(member),false]));repaint();s.corpusScroll=0;runtime.root.querySelector('[data-corpus-viewport]')?.scrollTo({top:0});save(runtime);return true}
  if('corpusOverview'in d){save(runtime);s.corpusFocus='';repaint();return true}
  if('corpusRetry'in d&&!('corpusBook'in d)){runtime.pendingCorpusMembers?.delete(d.corpusRetry);requestCorpusMember(runtime,d.corpusRetry,emit);return true}
  if('corpusBook'in d){
    const member=arr(runtime.data.field.members).find(m=>memberId(m)===d.corpusBook);if(!member)return true
    save(runtime);s.corpusFocus=d.corpusBook
    if('corpusRetry'in d)runtime.pendingCorpusMembers?.delete(d.corpusBook)
    requestCorpusMember(runtime,d.corpusBook,emit);repaint();return true
  }
  if('corpusReading'in d){save(runtime);s.corpusFocus='@corpus';repaint();return true}
  return false
}
// Layout controls update their own nodes; reading bodies, text selection and
// each pane's scrolling stay mounted until the actual reading content changes.
function paintFieldManager(runtime){
  const panel=runtime.root.querySelector('.field-manager');if(!panel)return false
  panel.hidden=!runtime.state.manager
  runtime.root.querySelectorAll('[data-manage]').forEach(button=>{button.classList.toggle('active',runtime.state.manager);button.setAttribute('aria-expanded',String(runtime.state.manager))})
  return true
}
function paintFieldPane(runtime,key){
  const pane=[...runtime.root.querySelectorAll('.field-pane')].find(pane=>pane.dataset.pane===key)
  if(!pane)return false
  save(runtime)
  const s=runtime.state,folded=runtime.data.reference?false:Boolean(s.folded[key]),width=Number(s.widths[key])
  pane.classList.toggle('folded',folded)
  if(Number.isFinite(width)&&width>=300)pane.style.setProperty('--pane-width',Math.min(1400,width)+'px')
  else pane.style.removeProperty('--pane-width')
  const handle=pane.querySelector('[data-resize]');handle?.setAttribute('aria-valuenow',Math.round(Number.isFinite(width)?width:pane.offsetWidth||540))
  runtime.root.querySelectorAll('[data-fold]').forEach(button=>{if(button.dataset.fold===key&&button.closest('.output-controls')){button.classList.toggle('active',!folded);button.setAttribute('aria-pressed',String(!folded))}})
  installPaneControls({ownerDocument:runtime.root.ownerDocument,querySelectorAll:()=>[pane]},runtime.paneControlState||(runtime.paneControlState={}),()=>drawThreads(runtime),runtime.data.field.id)
  const memory=s.positions[key],body=pane.querySelector('.pane-body')
  if(!folded&&body&&memory?.reading===pane.dataset.reading)body.scrollTop=memory.top||0
  updateLateralReaderChrome(runtime)
  runtime.paintTitleView?.()
  return true
}
function numoChambersHTML(field){
  const chambers=field.field==='numo'?arr(field.numo_chambers):[]
  if(!chambers.length)return ''
  return `<nav class="field-nav field-numo-nav" aria-label="Demons assigned in this reading"><span class="nav-label">Demon notebooks</span>${chambers.map(chamber=>`<button type="button" class="control" data-numo-chamber="${esc(chamber.mesh_id)}" data-numo-run="${esc(chamber.run_ref)}" title="${esc(`Open ${chamber.demon_name} notebook from ${chamber.run_ref}`)}">${esc(chamber.demon_name)} ↗</button>`).join('')}</nav>`
}
function openNumoChamber(runtime,d,emit){
  if(!('numoChamber'in d))return false
  const chamber=runtime.data.field.field==='numo'&&arr(runtime.data.field.numo_chambers).find(item=>item.mesh_id===d.numoChamber&&item.run_ref===d.numoRun)
  if(chamber)emit({type:'open_numo_chamber',mesh_id:chamber.mesh_id,run_id:chamber.run_ref})
  return true
}
function render(runtime){rememberLateralReaderMenu(runtime);const {data,state:s,root}=runtime,field=data.field,members=arr(field.members);root.style.setProperty('--scale',s.scale);if(isCorpusTracks(runtime)){renderCorpus(runtime);runtime.paintTitleView?.();runtime.paintVibrantView?.();return}cleanupCorpusReaders(runtime);const nav=workspaceEntries(runtime);root.innerHTML=`${field.field==='lateral'?lateralReaderHeader(runtime,nav):`<header class="field-head"><button type="button" class="control" ${field.field==='corpus'?'data-close-route':'data-library'}>← <span class="back-copy">${field.field==='corpus'?'Corpus':'Library'}</span></button><div class="field-heading"><h2>${esc(field.title)}</h2><p>${esc(field.description||field.author||'Read through to the source books')}</p></div><div class="field-actions">${CORPUS_BOOK_READER.readerMenu('view','View',CORPUS_BOOK_READER.titleViewControl()+CORPUS_BOOK_READER.vibrantViewControl()+CORPUS_BOOK_READER.connectionViewControl())}${connectionResolutionControl({connection:data.reference?{reference:data.reference,resolution:data.reference.resolution}:null})}${data.reference?'<button type="button" class="control active" data-close-route>× Close route</button>':`<button type="button" class="control ${s.lineage?'active':''}" data-lineage aria-pressed="${s.lineage}">Lineage</button>`}<button type="button" class="control ${s.manager?'active':''}" data-manage aria-expanded="${s.manager}">Books & layers${members.length?` · ${members.length}`:''}</button><button type="button" class="control text-size" data-scale="-.1" aria-label="Make reading text smaller">A−</button><button type="button" class="control text-size" data-scale=".1" aria-label="Make reading text larger">A+</button></div></header><nav class="field-nav" aria-label="Reading panes"><span class="nav-label">OPEN PANES</span>${nav.map((item,index)=>`${index?'<span class="nav-arrow">→</span>':''}<button type="button" class="control" style="--color:${color(item.layer)}" data-jump="${esc(item.id)}" title="${esc(item.title)}">${esc(item.title)}</button>`).join('')}</nav>`}${numoChambersHTML(field)}${field.field==='lateral'?'':managerHTML(runtime)}${arr(field.warnings).length?`<p class="field-warning">${esc(field.warnings.join(' '))}</p>`:''}<div class="field-strip" data-strip>${data.reference?routeWorkspace(runtime):fieldWorkspace(runtime,nav)}${!arr(field.panes).length&&!members.length?'<div class="field-empty"><h3>No saved reading yet</h3>This shelf opens completed texts when they are available.</div>':''}</div>${field.field==='lateral'?lateralReaderFooter(runtime):`<footer class="field-status"><span>${arr(field.panes).length} readings · ${members.length} source books</span><span>Drag a pane edge to resize · − folds a pane · Shift + scroll moves across</span></footer>`}`;const strip=root.querySelector('[data-strip]');strip.scrollLeft=s.left||0;root.querySelectorAll('.field-pane').forEach(pane=>{const key=pane.dataset.pane,reading=pane.dataset.reading,body=pane.querySelector('.pane-body'),memory=s.positions[key];if(body&&memory?.reading===reading)body.scrollTop=memory.top||0;pane.querySelectorAll('[data-section]').forEach(section=>{const val=s.sections[`${key}|${reading}|${section.dataset.section}`];if(typeof val==='boolean')section.open=val})});installPaneControls(root,runtime.paneControlState||(runtime.paneControlState={}),()=>drawThreads(runtime),field.id);updateLateralReaderChrome(runtime,true);applyFieldSelection(runtime);applyFieldBookmarks(runtime);runtime.paintConnectionView?.();runtime.paintTitleView?.();runtime.paintVibrantView?.();restoreLateralReaderMenu(runtime)}
function save(runtime){const {root,state:s}=runtime;if(!root.isConnected||(runtime.data.reference&&!isCorpusTracks(runtime)))return;const strip=root.querySelector('[data-strip]');if(strip){s.left=strip.scrollLeft;if(isCorpusTracks(runtime)&&s.corpusFocus){s.trackLeft=s.trackLeft||{};s.trackLeft[s.corpusFocus]=strip.scrollLeft}}const corpusViewport=root.querySelector('[data-corpus-viewport]');if(corpusViewport)s.corpusScroll=corpusViewport.scrollTop;root.querySelectorAll('.field-pane').forEach(pane=>{const key=pane.dataset.pane,reading=pane.dataset.reading,body=pane.querySelector('.pane-body');if(body&&!pane.classList.contains('folded'))s.positions[key]={reading,top:body.scrollTop};pane.querySelectorAll('[data-section]').forEach(section=>s.sections[`${key}|${reading}|${section.dataset.section}`]=section.open)});try{runtime.view.localStorage.setItem('care-field-layout-v3:'+runtime.data.field.id,JSON.stringify(s))}catch(_){}}
function focusPane(runtime,id){const root=runtime.root;let pane=[...root.querySelectorAll('[data-pane]')].find(p=>p.dataset.pane===id);if(!pane&&id.startsWith('member:'))pane=[...root.querySelectorAll('[data-book]')].find(p=>p.dataset.book===id.slice(7));const strip=root.querySelector('[data-strip]');if(pane&&strip){const a=pane.getBoundingClientRect(),b=strip.getBoundingClientRect();strip.scrollTo({left:Math.max(0,strip.scrollLeft+a.left-b.left-(runtime.data.reference?(strip.clientWidth-a.width)/2:12)),behavior:runtime.data.reference||runtime.view.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}
function drawThreads(runtime){
  if(isCorpusTracks(runtime)){drawCorpusRouteThreads(runtime);return}
  const {root,data}=runtime,strip=root.querySelector('[data-strip]');let svg=root.querySelector('[data-field-threads]')
  if(!strip||!data.reference){svg?.remove();return}
  const bounds=root.getBoundingClientRect(),clip=strip.getBoundingClientRect(),cards=new Map()
  root.querySelectorAll('[data-item-id]').forEach(card=>{
    const pane=card.closest('.field-pane'),body=card.closest('.pane-body'),rect=card.getBoundingClientRect(),bodyRect=body?.getBoundingClientRect()
    if(!pane||!bodyRect||!rect.width||!rect.height||card.closest('details:not([open])')||pane.hidden||pane.classList.contains('folded')||pane.classList.contains('care-pane-minimized')||rect.right<=clip.left||rect.left>=clip.right)return
    const y=Math.max(bodyRect.top+8,Math.min(bodyRect.bottom-8,rect.top+rect.height/2)),id=card.dataset.itemId,scope=card.dataset.sourcePane||''
    if(id){const key=scope+'|'+id;if(!cards.has(key))cards.set(key,{rect,y,pane,id,scope,visible:rect.bottom>bodyRect.top+8&&rect.top<bodyRect.bottom-8,key:JSON.stringify([pane.dataset.pane,pane.dataset.reading,scope,id])})}
  })
  const endpoint=(id,scope)=>{if(scope)return cards.get(scope+'|'+id);const matches=[...cards.values()].filter(card=>card.id===id);return matches.length===1?matches[0]:null}
  const edges=arr(data.reference.route_edges).map(edge=>({from:edge.source_id||edge.from,to:edge.target_id||edge.to,fromScope:edge.source_pane||edge.from_pane||'',toScope:edge.target_pane||edge.to_pane||''}))
  const refId=data.reference.id
  if(refId){
    arr(data.reference.built_from).forEach(item=>edges.push({from:item.id,to:refId,fromScope:item.source_pane||'',toScope:data.reference.source_pane||''}))
    arr(data.field.routes).filter(edge=>edge.kind==='axiom_trace'&&(edge.to===refId||edge.from===refId)).forEach(edge=>edges.push({...edge,fromScope:edge.source_pane||edge.from_pane||edge.fromScope||'',toScope:edge.target_pane||edge.to_pane||edge.toScope||''}))
  }
  const seen=new Set(),drawable=[]
  for(const edge of edges){
    const a=endpoint(edge.from,edge.fromScope),b=endpoint(edge.to,edge.toScope)
    if(!a||!b||a.key===b.key)continue
    const key=JSON.stringify([a.key,b.key]);if(seen.has(key))continue;seen.add(key)
    drawable.push({a,b,source_id:a.key,target_id:b.key,fullyVisible:a.visible&&b.visible})
  }
  // Keep margin continuations, but reduce only fully visible feeder paths.
  const retained=new Set(CORPUS_BOOK_READER.displayRouteEdges(drawable.filter(edge=>edge.fullyVisible),runtime.connectionView))
  const paths=drawable.filter(edge=>!edge.fullyVisible||retained.has(edge)).map(({a,b})=>{
    const forward=a.rect.left<b.rect.left,same=a.pane===b.pane,x1=(same?a.rect.left+3:forward?a.rect.right-3:a.rect.left+3)-bounds.left,x2=(same?b.rect.left+3:forward?b.rect.left+3:b.rect.right-3)-bounds.left,y1=a.y-bounds.top,y2=b.y-bounds.top,bend=Math.max(25,Math.abs(x2-x1)*.48),sign=forward?1:-1
    return `<path d="M${x1},${y1} C${same?x1-18:x1+bend*sign},${y1} ${same?x2-18:x2-bend*sign},${y2} ${x2},${y2}"/><circle cx="${x1}" cy="${y1}" r="2.5"/><circle cx="${x2}" cy="${y2}" r="2.5"/>`
  })
  if(!svg){svg=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('data-field-threads','');svg.setAttribute('aria-hidden','true');root.append(svg)}
  svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=`<defs><clipPath id="field-thread-clip"><rect x="${clip.left-bounds.left}" y="${clip.top-bounds.top}" width="${clip.width}" height="${clip.height}"/></clipPath></defs><g clip-path="url(#field-thread-clip)">${paths.join('')}</g>`
}
export default function(component){const root=component.parentElement.querySelector('[data-field-desk]');if(!root||!component.data?.field)return;const view=root.ownerDocument.defaultView;let runtime=INSTANCES.get(root);if(!runtime||runtime.data.field.id!==component.data.field.id){runtime?.renderCleanup?.();runtime={root,view,data:component.data,state:readLayout(view,component.data.field.id)};INSTANCES.set(root,runtime)}else save(runtime);const finishRender=beginFieldRender(runtime);runtime.data=component.data;let threadFrame=null;const queueThreads=()=>{if(!view.requestAnimationFrame||threadFrame!==null)return;threadFrame=view.requestAnimationFrame(()=>{threadFrame=null;drawThreads(runtime)})};const fresh=!runtime.state.started;if(fresh)initializeLayout(runtime);const nextRef=runtime.data.reference?.id||'',refKey=nextRef+'|'+(runtime.data.reference?.source_pane||'')+'|'+JSON.stringify(runtime.data.reference?.resolution||{}),newRef=nextRef&&runtime.lastRef!==refKey;runtime.lastRef=refKey;const emit=action=>{save(runtime);component.setTriggerValue('action',{...action,nonce:`${Date.now()}-${Math.random()}`})};const repaint=()=>{const active=root.querySelector(':focus'),identity=active?{...active.dataset}:null;save(runtime);render(runtime);if(identity){const target=[...root.querySelectorAll('button,select,input,[data-resize]')].find(el=>!el.closest('[hidden]')&&el.getClientRects().length&&Object.entries(identity).every(([key,value])=>el.dataset[key]===value));target?.focus({preventScroll:true})}queueThreads()};const load=id=>{const member=arr(runtime.data.field.members).find(m=>memberId(m)===id);if(!member)return;runtime.state.books[id]=false;restoreLateralLayers(runtime,id,LAYERS);const keys=[...LAYERS.map(layer=>`book:${id}:${layer}`),...memberOrigins(runtime,member).map(pane=>'field:'+pane.id)];keys.forEach(key=>{runtime.state.folded[key]=false;const control=runtime.paneControlState?.[runtime.data.field.id+'|'+key];if(control)control.minimized=false});if(!selectedLayers(runtime.state,member,runtime.data.stacks?.[id]).length)delete runtime.state.layers[id];if(!runtime.data.stacks?.[id]&&!memberOrigin(runtime,member))emit({type:'load_member',work_id:id});else{repaint();focusPane(runtime,'member:'+id)}};runtime.emit=emit;runtime.queueThreads=queueThreads;
// Local layout state already lives in the mounted DOM. Equal server payloads
// refresh callbacks without reconstructing the field or its reading panes.
const payloadSignature=JSON.stringify(runtime.data)
prepareLateralSavedFocus(runtime);
if(runtime.payloadSignature!==payloadSignature){render(runtime);runtime.payloadSignature=payloadSignature}
else if(isCorpusTracks(runtime)&&!runtime.corpusReadersMounted){mountCorpusReaders(runtime);applyCorpusDepth(runtime);observeCorpusBooks(runtime)}
applyLateralSavedFocus(runtime);
if(isCorpusTracks(runtime)){Object.keys(runtime.data.stacks||{}).forEach(id=>runtime.pendingCorpusMembers?.delete(id));if(!runtime.corpusFocusRestored){runtime.corpusFocusRestored=true;requestCorpusMember(runtime,runtime.state.corpusFocus,emit)}}if(newRef){const selected=fieldReferenceCard(runtime,runtime.data.reference);const selectedPane=selected?.closest('[data-pane]');if(selectedPane)focusPane(runtime,selectedPane.dataset.pane);const ids=new Set([nextRef,...Object.values(runtime.data.reference.route_layers||{}).flatMap(items=>arr(items).map(item=>item.id))]);root.querySelectorAll('[data-item-id]').forEach(card=>{if(ids.has(card.dataset.itemId)){const section=card.closest('details');if(section)section.open=true}})}queueThreads();
let resolutionUI=runtime.resolutionUI
if(!resolutionUI){resolutionUI={root,onConnectionClick:()=>false,onKey:()=>{}};setupConnectionResolution(resolutionUI);runtime.resolutionUI=resolutionUI}
const resolutionReference=runtime.data.field.field==='lateral'?lateralResolutionReference(runtime):runtime.data.reference
resolutionUI.data={connection:{reference:resolutionReference,resolution:resolutionReference?.resolution,overview:!runtime.data.reference}}
resolutionUI.beforeResolutionOpen=()=>{const reference=runtime.data.field.field==='lateral'?lateralResolutionReference(runtime):runtime.data.reference;resolutionUI.data={connection:{reference,resolution:reference?.resolution,overview:!runtime.data.reference}}}
resolutionUI.resolutionExtras=()=>runtime.data.field.field==='lateral'?lateralLayerMenu(runtime,null):''
resolutionUI.connectionAction=action=>{if(runtime.data.field.field==='lateral'){applyLateralResolution(runtime,action.resolution);if(!runtime.data.reference)repaint()}else runtime.emit?.({type:'resolution',resolution:action.resolution})}
const click=event=>{if(fieldBookmarkClick(runtime,event))return;if(resolutionUI.onConnectionClick(event)){if(event.target.closest?.('[data-connection-resolution]'))runtime.closeReaderMenu?.({children:false});return;}const node=event.target.closest('button');if(!node){const card=event.target.closest('[data-open-item]');if(card&&!String(view.getSelection?.()||''))selectFieldItem(runtime,card);return;}const d=node.dataset,s=runtime.state;if(openNumoChamber(runtime,d,emit))return;if(onCorpusClick(runtime,d,emit,repaint))return;if('fieldSections'in d){const pane=lateralVisiblePanes(runtime).find(pane=>pane.dataset.pane===runtime.fieldSelection?.pane_key)||lateralFocusedPane(runtime);pane?.querySelectorAll('details[data-section]').forEach(section=>section.open=d.fieldSections==='expand');save(runtime);queueThreads();return}if('lateralStep'in d){stepLateralReader(runtime,d.lateralStep);return}if('library'in d){emit({type:'library'});return}if('lineage'in d){s.lineage=!s.lineage;repaint();if(s.lineage)focusPane(runtime,'lineage');return}if('manage'in d){s.manager=!s.manager;if(paintFieldManager(runtime)){save(runtime);queueThreads()}else repaint();return}if('scale'in d){s.scale=Math.max(.8,Math.min(1.5,s.scale+Number(d.scale)));root.style.setProperty('--scale',s.scale);save(runtime);return}if('fold'in d){s.folded[d.fold]=!s.folded[d.fold];if(paintFieldPane(runtime,d.fold)){save(runtime);queueThreads()}else repaint();return}if('wide'in d){s.widths[d.wide]=s.widths[d.wide]>=780?540:Math.min(1100,Math.max(780,root.clientWidth-60));if(paintFieldPane(runtime,d.wide)){save(runtime);queueThreads()}else repaint();focusPane(runtime,d.wide);return}if('jump'in d){if(d.jump.startsWith('member:'))load(d.jump.slice(7));else{s.folded[d.jump]=false;const state=runtime.paneControlState?.[runtime.data.field.id+'|'+d.jump];if(state)state.minimized=false;if(paintFieldPane(runtime,d.jump)){save(runtime);queueThreads()}else repaint();focusPane(runtime,d.jump)}return}if('load'in d){load(d.load);return}if('currentBook'in d){s.currentBooks[d.currentBook]=!s.currentBooks[d.currentBook];load(d.currentBook);return}if('bookFold'in d){s.books[d.bookFold]=!s.books[d.bookFold];repaint();return}if('booksFold'in d){arr(runtime.data.field.members).forEach(m=>{s.books[memberId(m)]=d.booksFold==='yes';if(d.booksFold==='no')restoreLateralLayers(runtime,memberId(m),selectedLayers(s,m,runtime.data.stacks?.[memberId(m)]))});repaint();return}if('layer'in d||'allLayers'in d){const id=d.work||d.allLayers,member=arr(runtime.data.field.members).find(m=>memberId(m)===id),stack=runtime.data.stacks?.[id];if(!member)return;const current=selectedLayers(s,member,stack);s.layers[id]='allLayers'in d?availableLayers(member,stack):current.includes(d.layer)?current.filter(l=>l!==d.layer):LAYERS.filter(l=>l===d.layer||current.includes(l));s.books[id]=false;if('allLayers'in d||!current.includes(d.layer))restoreLateralLayers(runtime,id,'allLayers'in d?s.layers[id]:[d.layer]);if(!stack)emit({type:'load_member',work_id:id});repaint();return}if('sections'in d){node.closest('.field-pane').querySelectorAll('details').forEach(section=>section.open=d.sections==='expand');save(runtime);return}if('reference'in d){emit({type:'open_reference',reference_id:d.reference,work_id:d.work||'',source_pane:d.sourcePane||(node.closest('[data-pane]')?.dataset.pane?.startsWith('book:')?'':targetSourcePane(runtime,d.reference,node.closest('[data-item-id]')?.dataset.sourcePane||node.closest('[data-reading]')?.dataset.reading||''))});return}if('closeRoute'in d){emit({type:'clear_reference'});return}if('reset'in d){runtime.state=fieldDefaults();initializeLayout(runtime);runtime.state.manager=true;runtime.paneControlState={};render(runtime);save(runtime);return}};
const change=event=>{const node=event.target;if(node.matches('[data-route-unit]')){const pane=node.closest('.field-pane'),block=[...pane.querySelectorAll('[data-route-unit-block]')].find(block=>block.dataset.routeUnitBlock===node.value);if(block){block.open=true;block.scrollIntoView({block:'start',inline:'nearest'});queueThreads()}return}if(node.matches('[data-lateral-route-depth]')){setLateralRouteDepth(runtime,node.dataset.lateralRouteDepth,node.value);return}if(node.matches('[data-lateral-depth]')){if(setLateralDepth(runtime,node.dataset.lateralDepth,node.value)){repaint();focusPane(runtime,'member:'+node.dataset.lateralDepth)}return}if(node.matches('[data-corpus-output]')){runtime.state.corpusOutput=node.value;repaint();return}if(node.matches('[data-corpus-edition]')){runtime.state.corpusEditions=runtime.state.corpusEditions||{};runtime.state.corpusEditions[node.dataset.corpusEdition]=node.value;repaint();return}if(node.matches('[data-version]')){runtime.state.versions[node.dataset.version]=node.value;repaint();return}if(node.matches('[data-sheet]'))emit({type:node.dataset.sheet==='SOURCE'?'open_chapter':'open_sheet',work_id:node.dataset.work,unit_id:node.dataset.sheet==='SOURCE'?'':node.value,raw_unit_id:node.dataset.sheet==='SOURCE'?node.value:''})};
const input=event=>{if(!event.target.matches('[data-member-search]'))return;const query=event.target.value.toLowerCase();runtime.state.query=query;root.querySelectorAll('[data-member-row]').forEach(row=>row.hidden=!row.dataset.memberRow.includes(query));save(runtime)};
let dragging=null;const down=event=>{const handle=event.target.closest('[data-resize]');if(!handle||event.button!==0)return;event.preventDefault();dragging={handle,key:handle.dataset.resize,pane:handle.closest('.field-pane'),x:event.clientX,width:handle.closest('.field-pane').offsetWidth||handle.closest('.field-pane').getBoundingClientRect().width,zoom:handle.closest('.field-pane').getBoundingClientRect().width/(handle.closest('.field-pane').offsetWidth||handle.closest('.field-pane').getBoundingClientRect().width)};handle.setPointerCapture(event.pointerId)};const move=event=>{if(!dragging)return;const width=Math.max(300,Math.min(1400,dragging.width+(event.clientX-dragging.x)/(dragging.zoom||1)));runtime.state.widths[dragging.key]=width;dragging.pane.style.setProperty('--pane-width',width+'px');dragging.handle.setAttribute('aria-valuenow',Math.round(width));fitCorpusTracks(runtime)};const up=()=>{if(dragging){dragging=null;save(runtime)}};
const key=event=>{if(event.target.closest?.('.connection-resolution-panel')){resolutionUI.onKey(event);return}if(fieldSelectionKey(runtime,event))return;if(runtime.data.field.field==='lateral'&&['[',']'].includes(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest?.('input,select,textarea,[contenteditable="true"]')){event.preventDefault();stepLateralReader(runtime,event.key===']'?1:-1);return}const handle=event.target.closest('[data-resize]');if(handle&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const width=event.key==='Home'?300:event.key==='End'?1400:Math.max(300,Math.min(1400,(handle.closest('.field-pane').offsetWidth||handle.closest('.field-pane').getBoundingClientRect().width)+(event.key==='ArrowRight'?40:-40)));runtime.state.widths[handle.dataset.resize]=width;handle.closest('.field-pane').style.setProperty('--pane-width',width+'px');handle.setAttribute('aria-valuenow',Math.round(width));fitCorpusTracks(runtime);save(runtime)}};const resetWidth=event=>{const handle=event.target.closest('[data-resize]');if(handle){delete runtime.state.widths[handle.dataset.resize];if(paintFieldPane(runtime,handle.dataset.resize)){save(runtime);queueThreads()}else repaint()}};const wheel=event=>{if((event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))&&root.querySelector('[data-strip]')?.contains(event.target)){event.preventDefault();const strip=root.querySelector('[data-strip]'),unit=event.deltaMode===1?16:event.deltaMode===2?strip.clientWidth:1;strip.scrollLeft+=(event.shiftKey?event.deltaY||event.deltaX:event.deltaX)*unit}};
let timer,chromeFrame=null;const queue=event=>{
  // Scrolling changes geometry, never selected axioms or saved bookmarks.
  // Coalesce toolbar reads to one frame instead of walking every card on each
  // wheel/scroll event (including events from the nested native readers).
  if(event?.type==='toggle'&&!isCorpusTracks(runtime))applyFieldSelection(runtime)
  if(chromeFrame===null)chromeFrame=view.requestAnimationFrame(()=>{chromeFrame=null;if(isCorpusTracks(runtime))updateCorpusToolbar(runtime);else updateLateralReaderChrome(runtime);queueThreads()})
  view.clearTimeout(timer);timer=view.setTimeout(()=>save(runtime),150)
};const fit=()=>{const host=root.getRootNode().host;if(host?.clientHeight>0)root.style.height=host.clientHeight+'px';fitCorpusTracks(runtime);queueThreads()};fit();const observer=view.ResizeObserver?new view.ResizeObserver(fit):null;if(observer&&root.getRootNode().host)observer.observe(root.getRootNode().host);
CORPUS_BOOK_READER.setupTitleView(runtime);
CORPUS_BOOK_READER.setupVibrantView(runtime);
CORPUS_BOOK_READER.setupAxiomCopy(runtime);
runtime.onClick=click;CORPUS_BOOK_READER.setupConnectionView(runtime,queueThreads);runtime.attachConnectionView();runtime.closeConnectionResolution=()=>resolutionUI.closeConnectionResolution?.();runtime.onKey=key;CORPUS_BOOK_READER.setupReaderMenus(runtime);runtime.attachReaderMenus();runtime.restoreReaderMenu();
const menuClick=event=>{if(event.target.closest?.('.desk-menu-panel')&&event.target.closest?.('[data-jump],[data-manage],[data-lineage],[data-library],[data-close-route],[data-field-bookmark-open]'))runtime.closeReaderMenu({restoreFocus:true})};root.addEventListener('click',menuClick,true);
const events={click:runtime.onClick,change,input,pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,keydown:runtime.onKey,dblclick:resetWidth};for(const [name,fn]of Object.entries(events))root.addEventListener(name,fn);root.addEventListener('scroll',queue,true);root.addEventListener('toggle',queue,true);root.addEventListener('wheel',wheel,{passive:false});const flush=()=>save(runtime);view.addEventListener('pagehide',flush);return finishRender(()=>{runtime.cleanupAxiomCopy?.();runtime.cleanupTitleView?.();runtime.cleanupVibrantView?.();runtime.cleanupConnectionView?.();runtime.cleanupReaderMenus?.();root.removeEventListener('click',menuClick,true);save(runtime);view.clearTimeout(timer);if(chromeFrame!==null)view.cancelAnimationFrame?.(chromeFrame);observer?.disconnect();if(threadFrame!==null)view.cancelAnimationFrame?.(threadFrame);for(const [name,fn]of Object.entries(events))root.removeEventListener(name,fn);root.removeEventListener('scroll',queue,true);root.removeEventListener('toggle',queue,true);root.removeEventListener('wheel',wheel);view.removeEventListener('pagehide',flush)})
}
