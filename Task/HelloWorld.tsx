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

export interface IProductLine { 
    id: string; 
    name: string; 
    productName: string; 
    taskId: string | null; 
    serialNumber?: string;
    status?: string;
    rawStatus?: number;
    location?: string;
    productNumber?: string;
}

export interface IHelloWorldProps { 
    tasks: ITaskItem[]; 
    version: string;
    dependenciaFechas: boolean;
    projectId: string;
    context: ComponentFramework.Context<any>; 
    onRefresh: () => void;
    onOpenTask: (etn: string, id: string) => void;
    onCreateTask: () => void;
    onUpdateProgreso: (id: string, val: number) => void;
    onReparentTask: (childId: string, newParentId: string) => void;
    onUnparentTask: (childId: string) => void;
    onUpdateDependency: (taskId: string, dependencyId: string | null) => void;
    onUpdateItemDates: (id: string, start: Date, end: Date) => void;
    onUpdateParentRollup: (id: string, start: Date, end: Date, esfuerzo: number, imputadas: number, progreso: number) => void;
}

interface IHelloWorldState {
    collapsedParents: string[];
    activeView: 'grid' | 'gantt';
    ganttViewMode: ViewMode;
    hasError: boolean;
    errorMsg: string;
    isProductsOpen: boolean;
    productRefreshTrigger: number;
    products: IProductLine[];
    productsLoading: boolean;
}

// === FUNCIÓN DE TRADUCCIÓN ===
type TranslateFn = (key: string, fallback: string) => string;

// === PANEL LATERAL DE PRODUCTOS ===
interface IProductPanelProps { 
    projectId: string; 
    lines: IProductLine[];
    loading: boolean;
    onUnassign: (id: string) => void; 
    onUpdateStatus: (id: string, newStatus: number) => void;
    t: TranslateFn;
}
interface IProductPanelState { filter: 'unassigned' | 'assigned'; searchQuery: string; }

class ProductPanel extends React.Component<IProductPanelProps, IProductPanelState> {
    constructor(props: IProductPanelProps) {
        super(props);
        this.state = { filter: 'unassigned', searchQuery: '' };
    }
    
    render() {
        const { lines, loading, projectId, onUnassign, onUpdateStatus, t } = this.props;
        const { filter, searchQuery } = this.state;
        
        const pendingLines = lines.filter(l => !l.taskId);
        const assignedLines = lines.filter(l => !!l.taskId);
        
        const rawVisibleLines = filter === 'unassigned' ? pendingLines : assignedLines;
        
        const query = searchQuery.toLowerCase();
        const visibleLines = rawVisibleLines.filter(l => {
            if (!query) return true;
            return (
                (l.name && l.name.toLowerCase().includes(query)) ||
                (l.productName && l.productName.toLowerCase().includes(query)) ||
                (l.productNumber && l.productNumber.toLowerCase().includes(query)) ||
                (l.serialNumber && l.serialNumber.toLowerCase().includes(query))
            );
        });

        return (
            <div className="products-panel">
                <div className="panel-header">{t("Lbl_ProductsPanel", "Líneas de Producto")}</div>
                <div className="switch-container">
                    <button className={`btn-switch ${filter === 'unassigned' ? 'active' : ''}`} onClick={() => this.setState({ filter: 'unassigned' })}>
                        {t("Btn_Pending", "Pendientes")} ({pendingLines.length})
                    </button>
                    <button className={`btn-switch ${filter === 'assigned' ? 'active' : ''}`} onClick={() => this.setState({ filter: 'assigned' })}>
                        {t("Btn_Assigned", "Asignadas")} ({assignedLines.length})
                    </button>
                </div>
                
                <div className="search-container">
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder={t("Search_Placeholder", "Buscar producto, ID, S/N...")}
                        value={this.state.searchQuery} 
                        onChange={(e) => this.setState({ searchQuery: e.target.value })} 
                    />
                </div>
                
                <div className="card-container">
                    {!projectId && <div style={{padding:'10px', color:'#666', fontSize:'11px', gridColumn:'span 2'}}>{t("Lbl_SaveProjectFirst", "Guarde el proyecto primero.")}</div>}
                    {loading && <div style={{padding:'10px', color:'#666', fontSize:'11px', gridColumn:'span 2'}}>{t("Lbl_LoadingMaterials", "Cargando materiales...")}</div>}
                    {!loading && visibleLines.length === 0 && <div style={{padding:'10px', color:'#666', fontSize:'11px', gridColumn:'span 2'}}>{t("Lbl_NoMatchingLines", "No hay líneas que coincidan.")}</div>}
                    
                    {!loading && visibleLines.map(line => {
                        const isDraggable = filter === 'unassigned' && line.rawStatus === 909540000;
                        
                        const onDragStart = (e: React.DragEvent) => {
                            if (!isDraggable) { e.preventDefault(); return; }
                            e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'product', id: line.id }));
                            e.dataTransfer.effectAllowed = "copyMove";
                        };

                        let statusClass = "prod-status-default";
                        if (line.rawStatus === 909540000) statusClass = "prod-status-pend";
                        else if (line.rawStatus === 909540001) statusClass = "prod-status-inst";
                        else if (line.rawStatus === 909540002) statusClass = "prod-status-dev";

                        const titleDrag = isDraggable ? t("Lbl_DragToTask", "Arrastrar a tarea") : (filter === 'unassigned' ? t("Lbl_OnlyPendingDrag", "Solo los materiales Pendientes se pueden asignar") : "");

                        return (
                            <div key={line.id} className={`prod-card ${!isDraggable && filter === 'unassigned' ? 'not-draggable' : ''}`} draggable={isDraggable} onDragStart={onDragStart} title={titleDrag}>
                                <div className="card-title">{line.productName}</div>
                                <div className="card-sub">{line.name}</div>
                                <div className="card-id">ID: {line.productNumber || t("Lbl_NA", "N/A")}</div>
                                {line.serialNumber && <div style={{color: '#777', fontSize: '9px', marginTop: '2px'}}>S/N: {line.serialNumber}</div>}
                                
                                {line.status && (
                                    <div style={{marginTop: '4px'}}>
                                        <span className={`pill ${statusClass}`}>{line.status}</span>
                                    </div>
                                )}
                                
                                <div className="card-actions">
                                    {filter === 'assigned' && line.rawStatus === 909540000 && (
                                        <button className="btn-release" onClick={() => onUnassign(line.id)}>{t("Btn_Release", "Liberar")}</button>
                                    )}
                                    {line.rawStatus === 909540000 && (
                                        <button className="btn-install" onClick={() => onUpdateStatus(line.id, 909540001)}>{t("Btn_Install", "Instalar")}</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}

// === FACEPILE ===
interface IMemberFacepileProps { taskId: string, webAPI: ComponentFramework.WebApi, t: TranslateFn }
interface IMemberFacepileState { members: string[], loading: boolean }
class MemberFacepile extends React.Component<IMemberFacepileProps, IMemberFacepileState> {
    constructor(props: IMemberFacepileProps) {
        super(props);
        this.state = { members: [], loading: true };
    }
    componentDidMount() { this.fetchMembers(); }
    componentDidUpdate(prevProps: IMemberFacepileProps) {
        if (prevProps.taskId !== this.props.taskId) this.fetchMembers();
    }
    private fetchMembers = () => {
        this.setState({ loading: true });
        const fetchXml = `
        <fetch version="1.0" mapping="logical" no-lock="false" distinct="true">
            <entity name="sec_miembrodelequipo">
                <attribute name="sec_name"/>
                <filter type="and">
                    <condition attribute="statecode" operator="eq" value="0"/>
                    <condition attribute="sec_tareadeproyectoid" operator="eq" value="${this.props.taskId}"/>
                </filter>
            </entity>
        </fetch>`;
        const query = `?fetchXml=${encodeURIComponent(fetchXml)}`;
        this.props.webAPI.retrieveMultipleRecords("sec_miembrodelequipo", query).then(
            (result: any) => {
                const names = result.entities.map((e: any) => e.sec_name);
                this.setState({ members: names, loading: false });
            },
            () => { this.setState({ loading: false }); }
        );
    };
    render() {
        if (this.state.loading) return <span style={{fontSize:'9px', color:'#ccc'}}>...</span>;
        if (this.state.members.length === 0) return null;
        return (
            <div className="members-container">
                {this.state.members.slice(0, 3).map((name, i) => {
                    const initials = name ? name.substring(0, 2).toUpperCase() : "?";
                    const colors = ['#0078d4', '#498205', '#a4262c', '#69797e', '#4f6bed'];
                    const color = colors[name ? name.length % colors.length : 0];
                    return ( <div key={i} className="member-avatar" title={name} style={{backgroundColor: color}}>{initials}</div> );
                })}
                {this.state.members.length > 3 && <div className="member-avatar overflow" title={`+${this.state.members.length - 3} ${this.props.t("Lbl_More", "más")}`}>+{this.state.members.length - 3}</div>}
            </div>
        );
    }
}

// === FILA GRID NORMAL ===
interface ITaskRowProps { 
    task: ITaskItem, allTasks: ITaskItem[], isCollapsed: boolean, products: IProductLine[],
    onToggle: (id: string) => void, onOpen: (etn: string, id: string) => void, webAPI: ComponentFramework.WebApi,
    onDropAction: (draggedId: string, targetId: string) => void, 
    onAssignProduct: (productId: string, taskId: string) => void,
    onUnparentAction: (id: string) => void, onUpdateDep: (taskId: string, depId: string | null) => void,
    t: TranslateFn
}
interface ITaskRowState { isDragOver: boolean, localDepId: string }
class TaskRow extends React.Component<ITaskRowProps, ITaskRowState> {
    constructor(props: ITaskRowProps) {
        super(props);
        this.state = { isDragOver: false, localDepId: props.task.depId || "" };
    }
    componentDidUpdate(prevProps: ITaskRowProps) {
        if (prevProps.task.depId !== this.props.task.depId) this.setState({ localDepId: this.props.task.depId || "" });
    }
    handleDragStart = (e: React.DragEvent) => { 
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'task', id: this.props.task.id }));
        e.dataTransfer.effectAllowed = "move"; 
    };
    handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (!this.state.isDragOver) this.setState({ isDragOver: true }); };
    handleDragLeave = () => { this.setState({ isDragOver: false }); };
    
    handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); this.setState({ isDragOver: false });
        const rawData = e.dataTransfer.getData("text/plain");
        if (!rawData) return;

        try {
            const parsed = JSON.parse(rawData);
            if (parsed.type === 'task') {
                const draggedId = parsed.id;
                if (!draggedId || draggedId === this.props.task.id) return;
                if (this.props.task.parentId) { alert(this.props.t("Alert_DenyGrandchild", "⚠️ Acción Denegada: No aceptamos 'nietos'.")); return; }
                if (this.props.allTasks.some(t => t.parentId === draggedId)) { alert(this.props.t("Alert_DenyHasChildren", "🛑 Acción Denegada: La tarea tiene subtareas.")); return; }
                this.props.onDropAction(draggedId, this.props.task.id);
            } else if (parsed.type === 'product') {
                const hasChildren = this.props.allTasks.some(t => t.parentId === this.props.task.id);
                if (hasChildren) { 
                    alert(this.props.t("Alert_DenyAssignParent", "⚠️ Acción Denegada: No se pueden asignar materiales a tareas que contienen subtareas.")); 
                    return; 
                }
                this.props.onAssignProduct(parsed.id, this.props.task.id);
            }
        } catch (err) { }
    };

    handleUnparentClick = (e: React.MouseEvent) => { e.stopPropagation(); this.props.onUnparentAction(this.props.task.id); };
    handleDepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value; this.setState({ localDepId: val }); this.props.onUpdateDep(this.props.task.id, val === "" ? null : val);
    };
    
    render() {
        const { task, allTasks, isCollapsed, onToggle, onOpen, webAPI, products, t } = this.props;
        const isParent = Number.isInteger(task.virtualNro);
        const availableDependencies = allTasks.filter(candidate => candidate.id !== task.id && candidate.depId !== task.id);
        
        const taskProducts = products.filter(p => p.taskId === task.id);
        const hasProducts = taskProducts.length > 0;
        
        let summaryValues: any[] = [];
        if (hasProducts) {
            const summaryObj = taskProducts.reduce((acc, p) => {
                const safeId = p.productNumber || t("Lbl_NA", "N/A");
                const key = safeId + "_" + p.productName;
                
                if (!acc[key]) acc[key] = { name: p.productName, id: safeId, pend: 0, inst: 0, dev: 0 };
                
                if (p.rawStatus === 909540000) acc[key].pend++;
                else if (p.rawStatus === 909540001) acc[key].inst++;
                else if (p.rawStatus === 909540002) acc[key].dev++;
                return acc;
            }, {} as Record<string, {name: string, id: string, pend: number, inst: number, dev: number}>);
            
            summaryValues = Object.values(summaryObj);
        }

        return (
            <div className={`grid-row ${isParent ? 'row-parent' : 'row-child'} ${this.state.isDragOver ? 'row-drag-over' : ''}`} draggable="true" onDragStart={this.handleDragStart} onDragOver={this.handleDragOver} onDragLeave={this.handleDragLeave} onDrop={this.handleDrop}>
                <div className="gd-cell w-nro" title={t("Lbl_OrderHierarch", "Orden Jerárquico")}>{task.virtualNro.toFixed(2)}</div>
                
                <div className="gd-cell w-prod">
                    {hasProducts && (
                        <div className="prod-count-wrapper">
                            <span style={{ fontSize: '12px' }}>📦</span>
                            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#0078d4' }}>{taskProducts.length}</span>
                            
                            <div className="prod-tooltip">
                                <table className="tooltip-table">
                                    <thead>
                                        <tr>
                                            <th>{t("Lbl_Product", "Producto")}</th><th>{t("Col_ID", "ID")}</th>
                                            <th style={{textAlign:'center'}}>{t("Lbl_Pend_Short", "Pdte.")}</th>
                                            <th style={{textAlign:'center'}}>{t("Lbl_Inst_Short", "Inst.")}</th>
                                            <th style={{textAlign:'center'}}>{t("Lbl_Dev_Short", "Dev.")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryValues.map((s, idx) => (
                                            <tr key={idx}>
                                                <td>{s.name}</td>
                                                <td style={{fontFamily: 'monospace'}}>{s.id}</td>
                                                <td style={{textAlign: 'center'}}>{s.pend}</td>
                                                <td style={{textAlign: 'center'}}>{s.inst}</td>
                                                <td style={{textAlign: 'center'}}>{s.dev}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="gd-cell w-id" title={task.idTarea}>{task.idTarea}</div>
                <div className="gd-cell w-name" title={task.nombre}>
                    {isParent && <span className="toggle-btn" onClick={() => onToggle(task.id)}>{isCollapsed ? '▶' : '▼'}</span>}
                    {!isParent && <span className="child-indicator unbind-btn" style={{ marginLeft: '14px' }} onClick={this.handleUnparentClick} title={t("Tooltip_Unbind", "Desvincular")}>↳</span>}
                    <a className="link-name" onClick={() => onOpen(task.entityName, task.id)} style={{ fontWeight: isParent ? 'bold' : 'normal' }}>{task.nombre}</a>
                </div>
                <div className="gd-cell w-members"><MemberFacepile taskId={task.id} webAPI={webAPI} t={t} /></div>
                <div className="gd-cell w-date">{task.inicio}</div>
                <div className="gd-cell w-date">{task.fin}</div>
                <div className="gd-cell w-dep">
                    <select className="modern-select" value={this.state.localDepId} onChange={this.handleDepChange} title={t("Tooltip_SelectDep", "Seleccionar Dependencia")}>
                        <option value="">--</option>
                        {availableDependencies.map(opt => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                        {this.state.localDepId && !availableDependencies.find(x => x.id === this.state.localDepId) && ( <option value={this.state.localDepId} disabled>{task.depName || t("Opt_HiddenCycle", "(Oculta por ciclo)")}</option> )}
                    </select>
                </div>
                <div className="gd-cell w-num">{task.esfuerzo}</div>
                <div className="gd-cell w-num">{task.imputadas}</div>
                <div className="gd-cell w-prog" title={`${t("Col_Progress", "PROGRESO")}: ${task.progreso}%`}>
                    <div className="prog-bar-container"><div className="prog-bar-fill" style={{ width: `${task.progreso}%` }}></div></div><span className="lbl-percent">{task.progreso}%</span>
                </div>
                <div className="gd-cell w-stat"><span className={`pill ${task.estado.toLowerCase().includes('completada') ? 's-done' : 's-pend'}`}>{task.estado}</span></div>
            </div>
        );
    }
}

// === COMPONENTES SEGUROS GANTT ===
class CustomGanttHeader extends React.Component<any> {
    render() {
        const { headerHeight, fontFamily, fontSize, t } = this.props;
        return (
            <div className="grid-header" style={{ height: headerHeight, fontFamily, fontSize, borderBottom: '1px solid #ccc' }}>
                <div className="gh-cell" style={{ flexGrow: 2, minWidth: '180px', paddingLeft: '10px' }}>{t("Col_Name", "NOMBRE")}</div>
                <div className="gh-cell w-members">{t("Col_Team", "EQUIPO")}</div> 
                <div className="gh-cell w-date">{t("Col_Start", "INICIO")}</div>
                <div className="gh-cell w-date">{t("Col_End", "FIN")}</div>
            </div>
        );
    }
}

class CustomGanttTooltip extends React.Component<any> {
    render() {
        const { task, fontFamily, fontSize, t } = this.props;
        const formatGanttDate = (date: Date) => {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${d}/${m}/${y}`;
        };
        return (
            <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily, fontSize, border: '1px solid #e0e0e0', minWidth: '150px', zIndex: 9999 }}>
                <div style={{ fontWeight: 600, color: '#323130', marginBottom: '8px', borderBottom: '1px solid #f3f2f1', paddingBottom: '4px' }}>{task.name}</div>
                <div style={{ color: '#605e5c', marginBottom: '4px' }}><strong>{t("Col_Start", "INICIO")}:</strong> {formatGanttDate(task.start)}</div>
                <div style={{ color: '#605e5c', marginBottom: '4px' }}><strong>{t("Col_End", "FIN")}:</strong> {formatGanttDate(task.end)}</div>
                <div style={{ color: '#605e5c' }}><strong>{t("Col_Progress", "PROGRESO")}:</strong> {task.progress}%</div>
            </div>
        );
    }
}

class CustomGanttTable extends React.Component<any, { dragOverId: string | null }> {
    constructor(props: any) { super(props); this.state = { dragOverId: null }; }
    render() {
        const { rowHeight, tasks: ganttViewTasks, fontFamily, fontSize } = this.props.ganttProps;
        const { tasks, webAPI, onOpenTask, onReparentTask, onAssignProduct, onUnparentTask, t } = this.props;

        return (
            <div style={{ fontFamily, fontSize }}>
                {ganttViewTasks.map((tItem: GanttTask) => {
                    const originalTask = tasks.find((x: any) => x.id === tItem.id);
                    const isChild = originalTask ? !!originalTask.parentId : false;
                    
                    const handleDragStart = (e: React.DragEvent) => { 
                        e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'task', id: tItem.id })); 
                        e.dataTransfer.effectAllowed = "move"; 
                    };
                    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); if (this.state.dragOverId !== tItem.id) this.setState({ dragOverId: tItem.id }); };
                    const handleDragLeave = () => { if (this.state.dragOverId === tItem.id) this.setState({ dragOverId: null }); };
                    
                    const handleDrop = (e: React.DragEvent) => {
                        e.preventDefault(); this.setState({ dragOverId: null });
                        const rawData = e.dataTransfer.getData("text/plain");
                        if (!rawData) return;
                        
                        try {
                            const parsed = JSON.parse(rawData);
                            if (parsed.type === 'task') {
                                const draggedId = parsed.id;
                                if (!draggedId || draggedId === tItem.id) return;
                                if (originalTask && originalTask.parentId) { alert(t("Alert_DenyGrandchild", "⚠️ Acción Denegada: No aceptamos 'nietos'.")); return; }
                                if (tasks.some((x:any) => x.parentId === draggedId)) { alert(t("Alert_DenyHasChildren", "🛑 Acción Denegada: La tarea tiene subtareas.")); return; }
                                onReparentTask(draggedId, tItem.id);
                            } else if (parsed.type === 'product') {
                                const hasChildren = tasks.some((x:any) => x.parentId === tItem.id);
                                if (hasChildren) { 
                                    alert(t("Alert_DenyAssignParent", "⚠️ Acción Denegada: No se pueden asignar materiales a tareas que contienen subtareas.")); 
                                    return; 
                                }
                                onAssignProduct(parsed.id, tItem.id);
                            }
                        } catch (err) { }
                    };
                    
                    return (
                        <div className={`grid-row ${!isChild ? 'row-parent' : 'row-child'} ${this.state.dragOverId === tItem.id ? 'row-drag-over' : ''}`} style={{ height: rowHeight }} key={tItem.id} draggable="true" onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                            <div className="gd-cell" style={{ flexGrow: 2, minWidth: '180px', display: 'flex', alignItems: 'center' }} title={tItem.name}>
                                {!isChild && <span style={{ width: '10px', display: 'inline-block' }}></span>}
                                {isChild && <span className="child-indicator unbind-btn" style={{ marginLeft: '24px' }} onClick={(e) => { e.stopPropagation(); onUnparentTask(tItem.id); }} title={t("Tooltip_Unbind", "Desvincular")}>↳</span>}
                                <a className="link-name" onClick={() => { if(originalTask) onOpenTask(originalTask.entityName, originalTask.id) }} style={{ fontWeight: !isChild ? 'bold' : 'normal' }}>{tItem.name}</a>
                            </div>
                            <div className="gd-cell w-members"><MemberFacepile taskId={tItem.id} webAPI={webAPI} t={t} /></div>
                        </div>
                    );
                })}
            </div>
        );
    }
}

// === COMPONENTE PRINCIPAL ===
export class HelloWorld extends React.Component<IHelloWorldProps, IHelloWorldState> {
    private GanttTableWrapper: React.FC<any>;

    constructor(props: IHelloWorldProps) {
        super(props);
        this.state = { 
            collapsedParents: [],
            activeView: 'grid',
            ganttViewMode: ViewMode.Day,
            hasError: false,
            errorMsg: "",
            isProductsOpen: false,
            productRefreshTrigger: 0,
            products: [],
            productsLoading: false
        };

        const translateFn = (key: string, fallback: string) => this.props.context.resources.getString(key) || fallback;

        this.GanttTableWrapper = (ganttProps: any) => (
            <CustomGanttTable 
                ganttProps={ganttProps} tasks={this.props.tasks} webAPI={this.props.context.webAPI} t={translateFn}
                onOpenTask={this.props.onOpenTask} onReparentTask={this.props.onReparentTask} onUnparentTask={this.props.onUnparentTask}
                onAssignProduct={this.handleAssignProduct}
            />
        );
    }

    // Acceso centralizado a recursos
    private t = (key: string, fallback: string) => this.props.context.resources.getString(key) || fallback;

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ hasError: true, errorMsg: error.message });
        console.error("GANTT CRASH DETECTED:", error, errorInfo);
    }

    componentDidMount() {
        if (this.props.dependenciaFechas) this.syncParentRollups();
        if (this.props.projectId) this.fetchProducts();
    }

    componentDidUpdate(prevProps: IHelloWorldProps, prevState: IHelloWorldState) {
        if (this.props.dependenciaFechas && !this.state.hasError) this.syncParentRollups();
        
        if (prevProps.projectId !== this.props.projectId || prevState.productRefreshTrigger !== this.state.productRefreshTrigger) {
            if (this.props.projectId) this.fetchProducts();
        }
    }

    private handleRefreshAll = () => {
        this.props.onRefresh();
        this.setState({ productRefreshTrigger: Date.now() });
    }

    private fetchProducts = () => {
        this.setState({ productsLoading: true });
        
        const fetchXml = `
        <fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">
          <entity name="sec_lineadeproductodeproyecto">
            <attribute name="sec_lineadeproductodeproyectoid" />
            <attribute name="sec_name" />
            <attribute name="sec_tareadeproyectoid" />
            <attribute name="sec_numerodeserie" />
            <attribute name="sec_estadodelproducto" />
            <attribute name="sec_descripciondelaubicacion" />
            <order attribute="sec_name" descending="false" />
            <link-entity name="sec_productodeproyecto" from="sec_productodeproyectoid" to="sec_productodeproyectoid" link-type="inner" alias="ac">
              <attribute name="sec_nombre" />
              <attribute name="sec_productoid" />
              <filter type="and">
                <condition attribute="sec_proyectoid" operator="eq" value="${this.props.projectId}" />
              </filter>
              <link-entity name="product" from="productid" to="sec_productoid" alias="P">
                <attribute name="productnumber" />
              </link-entity>
            </link-entity>
          </entity>
        </fetch>`;

        const query = `?fetchXml=${encodeURIComponent(fetchXml)}`;
        
        this.props.context.webAPI.retrieveMultipleRecords("sec_lineadeproductodeproyecto", query).then(
            (result: any) => {
                const lines: IProductLine[] = result.entities.map((e: any) => {
                    const prodName = e["ac.sec_nombre"] || e["_sec_productodeproyectoid_value@OData.Community.Display.V1.FormattedValue"] || this.t("Lbl_UnknownProduct", "Producto Desconocido");
                    return {
                        id: e.sec_lineadeproductodeproyectoid,
                        name: e.sec_name,
                        productName: prodName,
                        taskId: e._sec_tareadeproyectoid_value || e.sec_tareadeproyectoid || null,
                        serialNumber: e.sec_numerodeserie,
                        status: e["sec_estadodelproducto@OData.Community.Display.V1.FormattedValue"] || e.sec_estadodelproducto,
                        rawStatus: e.sec_estadodelproducto,
                        location: e.sec_descripciondelaubicacion,
                        productNumber: e["P.productnumber"] || this.t("Lbl_NA", "N/A")
                    };
                });
                this.setState({ products: lines, productsLoading: false });
            },
            (error: any) => { 
                console.error(this.t("Err_LoadingProducts", "Error cargando productos:"), error);
                this.setState({ productsLoading: false }); 
            }
        );
    }

    private handleUnassignProduct = (productId: string) => {
        const data = { "sec_tareadeproyectoid": null };
        this.props.context.webAPI.updateRecord("sec_lineadeproductodeproyecto", productId, data)
        .then(() => {
            this.setState({ productRefreshTrigger: Date.now() });
        }, (err) => {
            this.props.context.navigation.openErrorDialog({ message: this.t("Err_ReleaseProduct", "Error liberando producto: ") + err.message });
        });
    }

    private handleAssignProduct = (productId: string, taskId: string) => {
        const data = { "sec_tareadeproyectoid@odata.bind": `/sec_tareas(${taskId})` };
        this.props.context.webAPI.updateRecord("sec_lineadeproductodeproyecto", productId, data)
        .then(() => {
            this.setState({ productRefreshTrigger: Date.now() });
        }, (err) => {
            this.props.context.navigation.openErrorDialog({ message: this.t("Err_AssignProduct", "Error asignando producto: ") + err.message });
        });
    }

    private handleUpdateProductStatus = (productId: string, newStatus: number) => {
        const data = { "sec_estadodelproducto": newStatus };
        this.props.context.webAPI.updateRecord("sec_lineadeproductodeproyecto", productId, data)
        .then(() => {
            this.setState({ productRefreshTrigger: Date.now() });
        }, (err: any) => {
            this.props.context.navigation.openErrorDialog({ message: this.t("Err_UpdateStatus", "Error actualizando estado: ") + err.message });
        });
    }

    private syncParentRollups = () => {
        const { tasks, onUpdateParentRollup } = this.props;
        const parents = tasks.filter(t => tasks.some(c => c.parentId === t.id));
        parents.forEach(p => {
            const computed = this.getComputedRollups(p.id, tasks);
            if (computed) {
                const fmt = (d: Date | null) => {
                    if (!d) return null;
                    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                
                const roundedEsfuerzo = Math.round(computed.esfuerzo * 100) / 100;
                const roundedImputadas = Math.round(computed.imputadas * 100) / 100;
                const roundedProgreso = computed.progreso;
                const pEsfuerzo = Math.round((parseFloat((p.esfuerzo || "0").toString().replace(',', '.')) || 0) * 100) / 100;
                const pImputadas = Math.round((parseFloat((p.imputadas || "0").toString().replace(',', '.')) || 0) * 100) / 100;
                
                if (fmt(computed.start) !== fmt(p.rawInicio) || 
                    fmt(computed.end) !== fmt(p.rawFin) ||
                    roundedEsfuerzo !== pEsfuerzo ||
                    roundedImputadas !== pImputadas ||
                    roundedProgreso !== p.progreso) {
                    
                    onUpdateParentRollup(p.id, computed.start, computed.end, roundedEsfuerzo, roundedImputadas, roundedProgreso);
                }
            }
        });
    }

    private getComputedRollups = (taskId: string, allTasks: ITaskItem[]): { start: Date, end: Date, esfuerzo: number, imputadas: number, progreso: number } | null => {
        const children = allTasks.filter(c => c.parentId === taskId);
        if (children.length === 0) return null;
        
        let minStart = new Date(8640000000000000); let maxEnd = new Date(-8640000000000000); 
        let hasValid = false;
        
        let sumEsfuerzo = 0; let sumImputadas = 0;
        let sumWeightedProgress = 0; let sumEsfuerzoForProgress = 0; 
        let sumRawProgress = 0; let childCount = 0;

        children.forEach(c => {
            const isParentItself = allTasks.some(grandChild => grandChild.parentId === c.id);
            let cStart: Date; let cEnd: Date;
            let cEsfuerzo = parseFloat((c.esfuerzo || "0").toString().replace(',', '.')) || 0;
            let cImputadas = parseFloat((c.imputadas || "0").toString().replace(',', '.')) || 0;
            let cProgreso = c.progreso || 0;

            if (isParentItself && this.props.dependenciaFechas) {
                const childComputed = this.getComputedRollups(c.id, allTasks);
                if (childComputed) { 
                    cStart = childComputed.start; cEnd = childComputed.end; 
                    cEsfuerzo = childComputed.esfuerzo; cImputadas = childComputed.imputadas;
                    cProgreso = childComputed.progreso;
                } 
                else {
                    cStart = c.rawInicio ? new Date(c.rawInicio) : new Date(); if (isNaN(cStart.getTime())) cStart = new Date();
                    cEnd = c.rawFin ? new Date(c.rawFin) : new Date(cStart.getTime() + 24 * 60 * 60 * 1000); if (isNaN(cEnd.getTime())) cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
                }
            } else {
                cStart = c.rawInicio ? new Date(c.rawInicio) : new Date(); if (isNaN(cStart.getTime())) cStart = new Date();
                cEnd = c.rawFin ? new Date(c.rawFin) : new Date(cStart.getTime() + 24 * 60 * 60 * 1000); if (isNaN(cEnd.getTime())) cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
            }

            cStart.setHours(0, 0, 0, 0);
            if (cEnd.getTime() <= cStart.getTime()) cEnd = new Date(cStart.getTime() + 24 * 60 * 60 * 1000);
            cEnd.setHours(23, 59, 59, 999);

            if (cStart < minStart) minStart = cStart;
            if (cEnd > maxEnd) maxEnd = cEnd;
            
            sumEsfuerzo += cEsfuerzo;
            sumImputadas += cImputadas;
            
            if (cEsfuerzo > 0) {
                sumWeightedProgress += (cProgreso * cEsfuerzo);
                sumEsfuerzoForProgress += cEsfuerzo;
            }
            sumRawProgress += cProgreso;
            childCount++;
            
            hasValid = true;
        });

        let finalProgress = 0;
        if (sumEsfuerzoForProgress > 0) {
            finalProgress = Math.round(sumWeightedProgress / sumEsfuerzoForProgress);
        } else if (childCount > 0) {
            finalProgress = Math.round(sumRawProgress / childCount);
        }

        return hasValid ? { start: minStart, end: maxEnd, esfuerzo: sumEsfuerzo, imputadas: sumImputadas, progreso: finalProgress } : null;
    };
    
    private toggleParent = (id: string) => {
        this.setState(prevState => {
            const list = prevState.collapsedParents;
            return list.includes(id) ? { collapsedParents: list.filter(x => x !== id) } : { collapsedParents: [...list, id] };
        });
    }

    private handleExportExcel = () => {
        const { tasks } = this.props;
        if (!tasks || tasks.length === 0) { alert(this.t("Msg_NoTasksExport", "No hay tareas para exportar.")); return; }
        const headers = ["#", "ID", this.t("Col_Name", "NOMBRE"), this.t("Col_Start", "INICIO"), this.t("Col_End", "FIN"), this.t("Col_Dep", "DEPENDENCIA"), this.t("Col_Effort", "ESFUERZO"), this.t("Col_Logged", "IMPUTADAS"), this.t("Col_Progress", "PROGRESO"), this.t("Col_Status", "ESTADO")];
        const rows = tasks.map(t => {
            const safeName = t.nombre ? `"${t.nombre.replace(/"/g, '""')}"` : "";
            const safeDep = t.depName ? `"${t.depName.replace(/"/g, '""')}"` : "";
            const safeState = t.estado ? `"${t.estado.replace(/"/g, '""')}"` : "";
            return [ t.virtualNro.toFixed(2), t.idTarea, safeName, t.inicio, t.fin, safeDep, t.esfuerzo, t.imputadas, `${t.progreso}%`, safeState ];
        });
        const csvContent = [headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    }

    public render(): React.ReactNode {
        const { tasks, dependenciaFechas, projectId, context } = this.props;
        const { activeView, ganttViewMode, isProductsOpen, products, productsLoading } = this.state;

        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: '#a4262c', backgroundColor: '#fde7e9', height: '100%', fontFamily: 'Segoe UI' }}>
                    <h3 style={{ marginTop: 0 }}>{this.t("Err_Security", "Aviso de Seguridad")}</h3>
                    <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>{this.t("Err_SecurityMsg", "Se ha evitado el cuelgue de la vista. Error reportado: ")} <br/><br/><b>{this.state.errorMsg}</b></p>
                    <button className="btn-new" onClick={() => this.setState({ hasError: false, activeView: 'grid' })}>{this.t("Btn_BackToList", "Volver a la Lista")}</button>
                </div>
            );
        }

        const visibleTasks = tasks.filter(t => !t.parentId || !this.state.collapsedParents.includes(t.parentId));
        const visibleIds = visibleTasks.map(vt => vt.id);

        let ganttTasks: GanttTask[] = [];
        let dynamicRowStyles = "";

        if (activeView === 'gantt' && visibleTasks.length > 0) {
            dynamicRowStyles = visibleTasks.map((vt, index) => {
                const isChildNode = !!vt.parentId;
                const bgColor = isChildNode ? '#fafafa' : '#ffffff';
                const yPos = index * 28;
                return `
                    .gantt-container svg g.gridBody rect.gridRow[y="${yPos}"] { fill: ${bgColor} !important; }
                    .gantt-container svg g.gridBody rect.gridRow:nth-child(${index + 1}) { fill: ${bgColor} !important; }
                `;
            }).join('\n');

            ganttTasks = visibleTasks.map(tItem => {
                let start = tItem.rawInicio ? new Date(tItem.rawInicio) : new Date();
                if (isNaN(start.getTime())) start = new Date();
                start.setHours(0, 0, 0, 0); 
                
                let end = tItem.rawFin ? new Date(tItem.rawFin) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
                if (isNaN(end.getTime())) end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                end.setHours(23, 59, 59, 999); 
                
                if (end.getTime() <= start.getTime()) {
                    end = new Date(start.getTime()); end.setDate(end.getDate() + 1); end.setHours(23, 59, 59, 999);
                }

                const hasVisibleChildren = visibleTasks.some(child => child.parentId === tItem.id); 
                const itemType = hasVisibleChildren ? 'project' : 'task';

                if (hasVisibleChildren && dependenciaFechas) {
                    const computed = this.getComputedRollups(tItem.id, tasks);
                    if (computed) { 
                        start = computed.start; 
                        end = computed.end; 
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);
                    }
                }

                const validProject = (tItem.parentId && visibleIds.includes(tItem.parentId)) ? tItem.parentId : undefined;
                const validDep = (tItem.depId && visibleIds.includes(tItem.depId)) ? [tItem.depId] : undefined;

                let progColor = '#031F30'; let progSelColor = '#021520'; let bgColor = '#b5c8d6'; let bgSelColor = '#94aabf';
                if (hasVisibleChildren) {
                    progColor = '#42638C'; progSelColor = '#2b4463'; bgColor = '#c7d1dc'; bgSelColor = '#a8b8ca';
                } else if (tItem.parentId) {
                    progColor = '#55419E'; progSelColor = '#3b2c6e'; bgColor = '#dcd9eb'; bgSelColor = '#c2bcde';
                }

                return {
                    start: start, end: end, name: tItem.nombre || "Sin nombre", id: tItem.id, type: itemType, progress: tItem.progreso || 0, isDisabled: false,
                    project: validProject, dependencies: validDep,
                    styles: { progressColor: progColor, progressSelectedColor: progSelColor, backgroundColor: bgColor, backgroundSelectedColor: bgSelColor }
                };
            });
        }

        return (
            <div className="pcf-container">
                <div className="v-tag">v{this.props.version}</div>
                
                <div className="header-actions">
                    <button className="btn-new" onClick={this.props.onCreateTask}>{this.t("Btn_NewTask", "+ Crear Tarea")}</button>
                    <button className="btn-excel" onClick={this.handleExportExcel} title={this.t("Tooltip_Excel", "Descargar CSV")}>{this.t("Btn_Excel", "📊 Excel")}</button>
                    <button className="btn-refresh" onClick={this.handleRefreshAll} title={this.t("Tooltip_RefreshAll", "Recargar todos los datos")}>{this.t("Btn_Refresh", "🔄 Refrescar")}</button>
                    
                    <span style={{fontSize:'10px', marginLeft:'10px', color:'#666'}}>{this.t("Msg_DragHint", "💡 Arrastra materiales hacia las tareas.")}</span>
                    
                    <div className="view-toggle-container">
                        <button className={`btn-view ${activeView === 'grid' ? 'active' : ''}`} onClick={() => this.setState({ activeView: 'grid' })}>{this.t("Btn_List", "Lista")}</button>
                        <button className={`btn-view ${activeView === 'gantt' ? 'active' : ''}`} onClick={() => this.setState({ activeView: 'gantt' })}>{this.t("Btn_Gantt", "Gantt")}</button>
                        
                        <button className={`btn-view ${isProductsOpen ? 'active-prod' : ''}`} style={{marginLeft:'10px'}} onClick={() => this.setState({ isProductsOpen: !isProductsOpen })}>
                            {this.t("Btn_Products", "📦 Productos")}
                        </button>
                    </div>

                    {activeView === 'gantt' && (
                        <div className="zoom-toggle-container">
                            <button className={`btn-zoom ${ganttViewMode === ViewMode.Day ? 'active' : ''}`} onClick={() => this.setState({ ganttViewMode: ViewMode.Day })}>{this.t("Btn_Days", "Días")}</button>
                            <button className={`btn-zoom ${ganttViewMode === ViewMode.Week ? 'active' : ''}`} onClick={() => this.setState({ ganttViewMode: ViewMode.Week })}>{this.t("Btn_Weeks", "Semanas")}</button>
                            <button className={`btn-zoom ${ganttViewMode === ViewMode.Month ? 'active' : ''}`} onClick={() => this.setState({ ganttViewMode: ViewMode.Month })}>{this.t("Btn_Months", "Meses")}</button>
                        </div>
                    )}
                </div>
                
                <div className="layout-split">
                    <div className="main-content">
                        {activeView === 'grid' && (
                            <>
                                <div className="grid-header">
                                    <div className="gh-cell w-nro">#</div>
                                    <div className="gh-cell w-prod" title={this.t("Tooltip_AssignedMaterials", "Materiales Asignados")}>📦</div>
                                    <div className="gh-cell w-id">ID</div>
                                    <div className="gh-cell w-name">{this.t("Col_Name", "NOMBRE")}</div>
                                    <div className="gh-cell w-members">{this.t("Col_Team", "EQUIPO")}</div>
                                    <div className="gh-cell w-date">{this.t("Col_Start", "INICIO")}</div>
                                    <div className="gh-cell w-date">{this.t("Col_End", "FIN")}</div>
                                    <div className="gh-cell w-dep">{this.t("Col_Dep", "DEPENDENCIA")}</div>
                                    <div className="gh-cell w-num">{this.t("Col_Effort", "ESFUERZO")}</div>
                                    <div className="gh-cell w-num">{this.t("Col_Logged", "IMPUTADAS")}</div>
                                    <div className="gh-cell w-prog">{this.t("Col_Progress", "PROGRESO")}</div>
                                    <div className="gh-cell w-stat">{this.t("Col_Status", "ESTADO")}</div>
                                </div>
                                <div className="grid-body">
                                    {visibleTasks.map((task) => (
                                        <TaskRow key={task.id} task={task} allTasks={this.props.tasks} products={products} isCollapsed={this.state.collapsedParents.includes(task.id)} onToggle={this.toggleParent}
                                            onOpen={this.props.onOpenTask} webAPI={this.props.context.webAPI} onDropAction={this.props.onReparentTask} onUnparentAction={this.props.onUnparentTask} onUpdateDep={this.props.onUpdateDependency}
                                            onAssignProduct={this.handleAssignProduct} t={this.t}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {activeView === 'gantt' && (
                            <div className="gantt-container">
                                <style>{dynamicRowStyles}</style>
                                {ganttTasks.length > 0 ? (
                                    <Gantt
                                        tasks={ganttTasks} viewMode={ganttViewMode}
                                        onDateChange={(task: GanttTask) => this.props.onUpdateItemDates(task.id, task.start, task.end)}
                                        onProgressChange={(task: GanttTask) => this.props.onUpdateProgreso(task.id, task.progress)}
                                        onDoubleClick={(task: GanttTask) => { const og = this.props.tasks.find(t => t.id === task.id); if (og) this.props.onOpenTask(og.entityName, og.id); }}
                                        rowHeight={28} listCellWidth="480px" columnWidth={60} locale="es" fontFamily="'Segoe UI', sans-serif" fontSize="12px" arrowColor="#d13438" 
                                        TaskListHeader={(p: any) => <CustomGanttHeader {...p} t={this.t} />} TaskListTable={this.GanttTableWrapper} TooltipContent={(p: any) => <CustomGanttTooltip {...p} t={this.t} />}
                                    />
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>{this.t("Msg_NoValidDatesGantt", "No hay datos de fechas válidas para mostrar en el Gantt.")}</div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {isProductsOpen && (
                        <ProductPanel 
                            projectId={projectId} 
                            lines={products}
                            loading={productsLoading}
                            onUnassign={this.handleUnassignProduct} 
                            onUpdateStatus={this.handleUpdateProductStatus}
                            t={this.t}
                        />
                    )}
                </div>
            </div>
        );
    }
}