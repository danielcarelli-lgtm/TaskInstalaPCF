/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import * as React from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

export interface ITaskItem {
    id: string; originalId?: string; idTarea: string; nombre: string; inicio: string;
    fin: string; esfuerzo: string; imputadas: string; progreso: number; 
    estado: string; parentId?: string; 
    depName?: string; depId?: string; 
    entityName: string;
    virtualNro: number; 
    rawInicio: Date | null; 
    rawFin: Date | null;
}

export interface IHelloWorldProps { 
    tasks: ITaskItem[]; 
    version: string;
    dependenciaFechas: boolean;
    context: ComponentFramework.Context<any>; 
    onOpenTask: (etn: string, id: string) => void;
    onCreateTask: () => void;
    onUpdateProgreso: (id: string, val: number) => void;
    onReparentTask: (childId: string, newParentId: string) => void;
    onUnparentTask: (childId: string) => void;
    onUpdateDependency: (taskId: string, dependencyId: string | null) => void;
    onUpdateDates: (id: string, start: Date, end: Date) => void;
}

interface IHelloWorldState {
    collapsedParents: string[];
    activeView: 'grid' | 'gantt';
    ganttViewMode: ViewMode;
}

// === FACEPILE ===
const MemberFacepile = (props: { taskId: string, webAPI: ComponentFramework.WebApi }) => {
    const [members, setMembers] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        const fetchXml = `
        <fetch version="1.0" mapping="logical" no-lock="false" distinct="true">
            <entity name="sec_miembrodelequipo">
                <attribute name="sec_name"/>
                <filter type="and">
                    <condition attribute="statecode" operator="eq" value="0"/>
                    <condition attribute="sec_tareadeproyectoid" operator="eq" value="${props.taskId}"/>
                </filter>
            </entity>
        </fetch>`;
        const query = `?fetchXml=${encodeURIComponent(fetchXml)}`;
        props.webAPI.retrieveMultipleRecords("sec_miembrodelequipo", query).then(
            (result: any) => {
                const names = result.entities.map((e: any) => e.sec_name);
                setMembers(names);
                setLoading(false);
            },
            () => { setLoading(false); }
        );
    }, [props.taskId]); 

    if (loading) return <span style={{fontSize:'9px', color:'#ccc'}}>...</span>;
    if (members.length === 0) return null;
    return (
        <div className="members-container">
            {members.slice(0, 3).map((name, i) => {
                const initials = name ? name.substring(0, 2).toUpperCase() : "?";
                const colors = ['#0078d4', '#498205', '#a4262c', '#69797e', '#4f6bed'];
                const color = colors[name ? name.length % colors.length : 0];
                return ( <div key={i} className="member-avatar" title={name} style={{backgroundColor: color}}>{initials}</div> );
            })}
            {members.length > 3 && <div className="member-avatar overflow" title={`+${members.length - 3} más`}>+{members.length - 3}</div>}
        </div>
    );
};

// === FILA ===
const TaskRow = (props: { 
    task: ITaskItem, 
    allTasks: ITaskItem[], 
    isCollapsed: boolean,
    onToggle: (id: string) => void,
    onOpen: (etn: string, id: string) => void,
    webAPI: ComponentFramework.WebApi,
    onDropAction: (draggedId: string, targetId: string) => void,
    onUnparentAction: (id: string) => void,
    onUpdateDep: (taskId: string, depId: string | null) => void
}) => {
    const { task, allTasks, isCollapsed, onToggle, onOpen, webAPI, onDropAction, onUnparentAction, onUpdateDep } = props;
    const isParent = Number.isInteger(task.virtualNro);
    const [isDragOver, setIsDragOver] = React.useState(false);
    
    // Sincronizar si cambia desde fuera (ej. carga inicial)
    const [localDepId, setLocalDepId] = React.useState(task.depId || "");
    React.useEffect(() => {
        setLocalDepId(task.depId || "");
    }, [task.depId]);

    // --- LOGICA DRAG & DROP ---
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (!isDragOver) setIsDragOver(true); };
    const handleDragLeave = () => { setIsDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === task.id) return;
        if (task.parentId) { alert("⚠️ Acción Denegada: No aceptamos 'nietos'."); return; }
        if (allTasks.some(t => t.parentId === draggedId)) { alert("🛑 Acción Denegada: La tarea tiene subtareas."); return; }
        onDropAction(draggedId, task.id);
    };
    
    // --- DESAGRUPAR ---
    const handleUnparentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUnparentAction(task.id);
    };

    // --- DEPENDENCIA ---
    const handleDepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setLocalDepId(val);
        onUpdateDep(task.id, val === "" ? null : val);
    };

    const availableDependencies = allTasks.filter(candidate => {
        if (candidate.id === task.id) return false;
        if (candidate.depId === task.id) return false;
        return true;
    });

    return (
        <div 
            className={`grid-row ${isParent ? 'row-parent' : 'row-child'} ${isDragOver ? 'row-drag-over' : ''}`}
            draggable="true"
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="gd-cell w-nro" title="Orden Jerárquico">{task.virtualNro.toFixed(2)}</div>
            <div className="gd-cell w-id" title={task.idTarea}>{task.idTarea}</div>
            
            <div className="gd-cell w-name" title={task.nombre} style={{ paddingLeft: isParent ? '0px' : '20px' }}>
                {isParent && <span className="toggle-btn" onClick={() => onToggle(task.id)}>{isCollapsed ? '▶' : '▼'}</span>}
                {!isParent && <span className="child-indicator unbind-btn" onClick={handleUnparentClick} title="Desvincular">↳</span>}
                <a className="link-name" onClick={() => onOpen(task.entityName, task.id)} style={{ fontWeight: isParent ? 'bold' : 'normal' }}>{task.nombre}</a>
            </div>

            <div className="gd-cell w-members"><MemberFacepile taskId={task.id} webAPI={webAPI} /></div>

            <div className="gd-cell w-date">{task.inicio}</div>
            <div className="gd-cell w-date">{task.fin}</div>
            
            <div className="gd-cell w-dep">
                <select 
                    className="modern-select" 
                    value={localDepId} 
                    onChange={handleDepChange}
                    title="Seleccionar Dependencia"
                >
                    <option value="">--</option>
                    {availableDependencies.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.nombre}
                        </option>
                    ))}
                    {localDepId && !availableDependencies.find(x => x.id === localDepId) && (
                         <option value={localDepId} disabled>
                             {task.depName || "(Oculta por ciclo)"}
                         </option>
                    )}
                </select>
            </div>

            <div className="gd-cell w-num">{task.esfuerzo}</div>
            <div className="gd-cell w-num">{task.imputadas}</div>
            
            <div className="gd-cell w-prog" title={`Progreso: ${task.progreso}%`}>
                <div className="prog-bar-container"><div className="prog-bar-fill" style={{ width: `${task.progreso}%` }}></div></div>
                <span className="lbl-percent">{task.progreso}%</span>
            </div>

            <div className="gd-cell w-stat">
                <span className={`pill ${task.estado.toLowerCase().includes('completada') ? 's-done' : 's-pend'}`}>{task.estado}</span>
            </div>
        </div>
    );
};

export class HelloWorld extends React.Component<IHelloWorldProps, IHelloWorldState> {
    constructor(props: IHelloWorldProps) {
        super(props);
        this.state = { 
            collapsedParents: [],
            activeView: 'grid',
            ganttViewMode: ViewMode.Day
        };
    }
    
    private toggleParent = (id: string) => {
        this.setState(prevState => {
            const list = prevState.collapsedParents;
            return list.includes(id) ? { collapsedParents: list.filter(x => x !== id) } : { collapsedParents: [...list, id] };
        });
    }

    private handleExportExcel = () => {
        const { tasks } = this.props;
        if (!tasks || tasks.length === 0) {
            alert("No hay tareas para exportar.");
            return;
        }

        const headers = ["#", "ID Tarea", "Nombre", "Inicio", "Fin", "Dependencia", "Esfuerzo", "Imputadas", "Progreso", "Estado"];

        const rows = tasks.map(t => {
            const safeName = t.nombre ? `"${t.nombre.replace(/"/g, '""')}"` : "";
            const safeDep = t.depName ? `"${t.depName.replace(/"/g, '""')}"` : "";
            const safeState = t.estado ? `"${t.estado.replace(/"/g, '""')}"` : "";

            return [
                t.virtualNro.toFixed(2),
                t.idTarea,
                safeName,
                t.inicio,
                t.fin,
                safeDep,
                t.esfuerzo,
                t.imputadas,
                `${t.progreso}%`,
                safeState
            ];
        });

        const csvContent = [
            headers.join(";"), 
            ...rows.map(row => row.join(";"))
        ].join("\n");

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `Tareas_Export_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Calcula dinámicamente las fechas min/max de los hijos para un padre
    private getComputedDates = (parentId: string, allTasks: ITaskItem[]): { start: Date, end: Date } | null => {
        const children = allTasks.filter(c => c.parentId === parentId);
        if (children.length === 0) return null;
        
        let minStart = new Date(8640000000000000);
        let maxEnd = new Date(-8640000000000000);
        let hasValid = false;

        children.forEach(c => {
            // SOLUCIÓN ESLINT: Cambiado let por const
            const cStart = c.rawInicio ? new Date(c.rawInicio) : new Date();
            const cEnd = c.rawFin ? new Date(c.rawFin) : new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
            
            if (cEnd < cStart) cEnd.setTime(cStart.getTime() + 24 * 60 * 60 * 1000);

            if (cStart < minStart) minStart = cStart;
            if (cEnd > maxEnd) maxEnd = cEnd;
            hasValid = true;
        });

        return hasValid ? { start: minStart, end: maxEnd } : null;
    };

    public render(): React.ReactNode {
        const { tasks, dependenciaFechas } = this.props;
        const { activeView, ganttViewMode } = this.state;

        const visibleTasks = tasks.filter(t => {
            if (!t.parentId) return true;
            return !this.state.collapsedParents.includes(t.parentId);
        });

        // ==========================================
        // CONFIGURACIONES EXCLUSIVAS DEL GANTT
        // ==========================================
        let ganttTasks: GanttTask[] = [];
        if (activeView === 'gantt' && visibleTasks.length > 0) {
            ganttTasks = visibleTasks.map(t => {
                let start = t.rawInicio ? new Date(t.rawInicio) : new Date();
                let end = t.rawFin ? new Date(t.rawFin) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
                if (end < start) end.setTime(start.getTime() + 24 * 60 * 60 * 1000);

                const isRoot = !t.parentId; 
                const hasChildren = tasks.some(child => child.parentId === t.id); 
                
                // Si dependenciaFechas es FALSO, las tareas principales son tipo 'task' y se pueden arrastrar libremente.
                const itemType = (isRoot && hasChildren && dependenciaFechas) ? 'project' : 'task';

                // Si tiene hijas y la configuración está activa, calculamos dinámicamente sus fechas
                if (hasChildren && dependenciaFechas) {
                    const computed = this.getComputedDates(t.id, tasks);
                    if (computed) {
                        start = computed.start;
                        end = computed.end;
                    }
                }

                // Paleta de Colores Solicitada
                let progColor = '#031F30';  // Primarias (sin hijas)
                let progSelColor = '#021520';
                let bgColor = '#b5c8d6';
                let bgSelColor = '#94aabf';

                if (isRoot && hasChildren) {
                    progColor = '#42638C';  // Corchetes (padres con hijas)
                    progSelColor = '#2b4463';
                    bgColor = '#c7d1dc';
                    bgSelColor = '#a8b8ca';
                } else if (!isRoot) {
                    progColor = '#55419E';  // Secundarias (hijas)
                    progSelColor = '#3b2c6e';
                    bgColor = '#dcd9eb';
                    bgSelColor = '#c2bcde';
                }

                return {
                    start: start,
                    end: end,
                    name: t.nombre || "Sin nombre",
                    id: t.id,
                    type: itemType,
                    progress: t.progreso,
                    isDisabled: false,
                    project: t.parentId, 
                    dependencies: t.depId ? [t.depId] : undefined,
                    styles: {
                        progressColor: progColor,
                        progressSelectedColor: progSelColor,
                        backgroundColor: bgColor,
                        backgroundSelectedColor: bgSelColor,
                    }
                };
            });
        }

        const GanttCustomHeader: React.FC<any> = ({ headerHeight, fontFamily, fontSize }) => (
            <div className="grid-header" style={{ height: headerHeight, fontFamily, fontSize, borderBottom: '1px solid #ccc' }}>
                <div className="gh-cell" style={{ flexGrow: 2, minWidth: '180px', paddingLeft: '10px' }}>NOMBRE</div>
                <div className="gh-cell w-date">INICIO</div>
                <div className="gh-cell w-date">FIN</div>
            </div>
        );

        const GanttCustomTable: React.FC<any> = ({ rowHeight, tasks: ganttViewTasks, fontFamily, fontSize }) => {
            const [dragOverId, setDragOverId] = React.useState<string | null>(null);

            const formatGanttDate = (date: Date) => {
                const d = String(date.getDate()).padStart(2, '0');
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const y = date.getFullYear();
                return `${d}/${m}/${y}`;
            };

            return (
                <div style={{ fontFamily, fontSize }}>
                    {ganttViewTasks.map((t: GanttTask) => {
                        const originalTask = this.props.tasks.find(x => x.id === t.id);
                        const isChild = originalTask ? !!originalTask.parentId : false;

                        const handleDragStart = (e: React.DragEvent) => {
                            e.dataTransfer.setData("text/plain", t.id);
                            e.dataTransfer.effectAllowed = "move";
                        };
                        const handleDragOver = (e: React.DragEvent) => { 
                            e.preventDefault(); 
                            if (dragOverId !== t.id) setDragOverId(t.id); 
                        };
                        const handleDragLeave = () => { 
                            if (dragOverId === t.id) setDragOverId(null); 
                        };
                        const handleDrop = (e: React.DragEvent) => {
                            e.preventDefault(); 
                            setDragOverId(null);
                            const draggedId = e.dataTransfer.getData("text/plain");
                            if (!draggedId || draggedId === t.id) return;
                            if (originalTask && originalTask.parentId) { alert("⚠️ Acción Denegada: No aceptamos 'nietos'."); return; }
                            if (this.props.tasks.some(x => x.parentId === draggedId)) { alert("🛑 Acción Denegada: La tarea tiene subtareas."); return; }
                            this.props.onReparentTask(draggedId, t.id);
                        };

                        const handleUnparentClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            this.props.onUnparentTask(t.id);
                        };

                        return (
                            <div 
                                className={`grid-row ${!isChild ? 'row-parent' : 'row-child'} ${dragOverId === t.id ? 'row-drag-over' : ''}`} 
                                style={{ height: rowHeight }} 
                                key={t.id}
                                draggable="true"
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="gd-cell" style={{ flexGrow: 2, minWidth: '180px', paddingLeft: isChild ? '30px' : '10px', display: 'flex', alignItems: 'center' }} title={t.name}>
                                    {isChild && <span className="child-indicator unbind-btn" onClick={handleUnparentClick} title="Desvincular">↳</span>}
                                    <a className="link-name" onClick={() => { if(originalTask) this.props.onOpenTask(originalTask.entityName, originalTask.id) }} style={{ fontWeight: !isChild ? 'bold' : 'normal' }}>
                                        {t.name}
                                    </a>
                                </div>
                                <div className="gd-cell w-date">{formatGanttDate(t.start)}</div>
                                <div className="gd-cell w-date">{formatGanttDate(t.end)}</div>
                            </div>
                        );
                    })}
                </div>
            );
        };

        const GanttCustomTooltip: React.FC<any> = ({ task, fontFamily, fontSize }) => {
            const formatGanttDate = (date: Date) => {
                const d = String(date.getDate()).padStart(2, '0');
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const y = date.getFullYear();
                return `${d}/${m}/${y}`;
            };
            return (
                <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff', 
                    borderRadius: '4px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', 
                    fontFamily, 
                    fontSize, 
                    border: '1px solid #e0e0e0',
                    minWidth: '150px'
                }}>
                    <div style={{ fontWeight: 600, color: '#323130', marginBottom: '8px', borderBottom: '1px solid #f3f2f1', paddingBottom: '4px' }}>
                        {task.name}
                    </div>
                    <div style={{ color: '#605e5c', marginBottom: '4px' }}><strong>Inicio:</strong> {formatGanttDate(task.start)}</div>
                    <div style={{ color: '#605e5c', marginBottom: '4px' }}><strong>Fin:</strong> {formatGanttDate(task.end)}</div>
                    <div style={{ color: '#605e5c' }}><strong>Progreso:</strong> {task.progress}%</div>
                </div>
            );
        };

        return (
            <div className="pcf-container">
                <div className="v-tag">v{this.props.version}</div>
                
                <div className="header-actions">
                    <button className="btn-new" onClick={this.props.onCreateTask}>+ Crear Tarea</button>
                    <button className="btn-excel" onClick={this.handleExportExcel} title="Descargar CSV">📊 Excel</button>
                    <span style={{fontSize:'10px', marginLeft:'10px', color:'#666'}}>💡 Arrastra para agrupar. Click en ↳ para desagrupar.</span>
                    
                    {/* SELECTOR DE VISTAS */}
                    <div className="view-toggle-container">
                        <button 
                            className={`btn-view ${activeView === 'grid' ? 'active' : ''}`} 
                            onClick={() => this.setState({ activeView: 'grid' })}
                        >
                            Lista
                        </button>
                        <button 
                            className={`btn-view ${activeView === 'gantt' ? 'active' : ''}`} 
                            onClick={() => this.setState({ activeView: 'gantt' })}
                        >
                            Gantt
                        </button>
                    </div>

                    {/* SELECTOR DE ZOOM (Solo visible en Gantt) */}
                    {activeView === 'gantt' && (
                        <div className="zoom-toggle-container">
                            <button 
                                className={`btn-zoom ${ganttViewMode === ViewMode.Day ? 'active' : ''}`} 
                                onClick={() => this.setState({ ganttViewMode: ViewMode.Day })}
                            >Días</button>
                            <button 
                                className={`btn-zoom ${ganttViewMode === ViewMode.Week ? 'active' : ''}`} 
                                onClick={() => this.setState({ ganttViewMode: ViewMode.Week })}
                            >Semanas</button>
                            <button 
                                className={`btn-zoom ${ganttViewMode === ViewMode.Month ? 'active' : ''}`} 
                                onClick={() => this.setState({ ganttViewMode: ViewMode.Month })}
                            >Meses</button>
                        </div>
                    )}
                </div>
                
                {/* VISTA 1: LISTA (GRID) ORIGINAL */}
                {activeView === 'grid' && (
                    <>
                        <div className="grid-header">
                            <div className="gh-cell w-nro">#</div>
                            <div className="gh-cell w-id">ID</div>
                            <div className="gh-cell w-name">NOMBRE</div>
                            <div className="gh-cell w-members">EQUIPO</div>
                            <div className="gh-cell w-date">INICIO</div>
                            <div className="gh-cell w-date">FIN</div>
                            <div className="gh-cell w-dep">DEPENDENCIA</div>
                            <div className="gh-cell w-num">ESFUERZO</div>
                            <div className="gh-cell w-num">IMPUTADAS</div>
                            <div className="gh-cell w-prog">PROGRESO</div>
                            <div className="gh-cell w-stat">ESTADO</div>
                        </div>

                        <div className="grid-body">
                            {visibleTasks.map((task) => (
                                <TaskRow key={task.id} task={task} 
                                    allTasks={this.props.tasks} 
                                    isCollapsed={this.state.collapsedParents.includes(task.id)}
                                    onToggle={this.toggleParent}
                                    onOpen={this.props.onOpenTask}
                                    webAPI={this.props.context.webAPI}
                                    onDropAction={this.props.onReparentTask}
                                    onUnparentAction={this.props.onUnparentTask}
                                    onUpdateDep={this.props.onUpdateDependency}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* VISTA 2: GANTT HOMOLOGADO */}
                {activeView === 'gantt' && (
                    <div className="gantt-container">
                        {ganttTasks.length > 0 ? (
                            <Gantt
                                tasks={ganttTasks}
                                viewMode={ganttViewMode}
                                onDateChange={(task: GanttTask) => this.props.onUpdateDates(task.id, task.start, task.end)}
                                onProgressChange={(task: GanttTask) => this.props.onUpdateProgreso(task.id, task.progress)}
                                onDoubleClick={(task: GanttTask) => {
                                    const originalTask = this.props.tasks.find(t => t.id === task.id);
                                    if (originalTask) this.props.onOpenTask(originalTask.entityName, originalTask.id);
                                }}
                                rowHeight={28}
                                listCellWidth="400px"
                                columnWidth={60}
                                locale="es"
                                fontFamily="'Segoe UI', sans-serif"
                                fontSize="12px"
                                TaskListHeader={GanttCustomHeader}
                                TaskListTable={GanttCustomTable}
                                TooltipContent={GanttCustomTooltip}
                            />
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                No hay datos de fechas válidas para mostrar en el Gantt.
                            </div>
                        )}
                    </div>
                )}

            </div>
        );
    }
}