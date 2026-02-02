/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/always-return */
import * as React from 'react';

export interface ITaskItem {
    id: string; originalId?: string; idTarea: string; nombre: string; inicio: string;
    fin: string; esfuerzo: string; imputadas: string; progreso: number; 
    estado: string; parentId?: string; depName?: string; entityName: string;
    virtualNro: number; 
}

export interface IHelloWorldProps { 
    tasks: ITaskItem[]; 
    version: string;
    context: ComponentFramework.Context<any>; 
    onOpenTask: (etn: string, id: string) => void;
    onCreateTask: () => void;
    onUpdateProgreso: (id: string, val: number) => void;
    onReparentTask: (childId: string, newParentId: string) => void; // Callback Drag&Drop
}

interface IHelloWorldState {
    collapsedParents: string[];
}

// === FACEPILE (Sin Cambios) ===
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

// === FILA CON DRAG & DROP ===
const TaskRow = (props: { 
    task: ITaskItem, 
    isCollapsed: boolean,
    onToggle: (id: string) => void,
    onOpen: (etn: string, id: string) => void,
    webAPI: ComponentFramework.WebApi,
    onDropAction: (draggedId: string, targetId: string) => void
}) => {
    const { task, isCollapsed, onToggle, onOpen, webAPI, onDropAction } = props;
    const isParent = Number.isInteger(task.virtualNro);
    const [isDragOver, setIsDragOver] = React.useState(false);

    // Eventos Drag & Drop
    const handleDragStart = (e: React.DragEvent) => {
        // Guardamos el ID de la tarea que estamos arrastrando
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necesario para permitir el Drop
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData("text/plain");
        
        // Evitar soltar sobre sí mismo
        if (draggedId && draggedId !== task.id) {
            onDropAction(draggedId, task.id);
        }
    };

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
                {isParent && (
                    <span className="toggle-btn" onClick={() => onToggle(task.id)}>
                        {isCollapsed ? '▶' : '▼'}
                    </span>
                )}
                {!isParent && <span className="child-indicator">↳</span>}
                <a className="link-name" onClick={() => onOpen(task.entityName, task.id)} 
                   style={{ fontWeight: isParent ? 'bold' : 'normal' }}>
                   {task.nombre}
                </a>
            </div>

            <div className="gd-cell w-members">
                <MemberFacepile taskId={task.id} webAPI={webAPI} />
            </div>

            <div className="gd-cell w-date" title={task.inicio}>{task.inicio}</div>
            <div className="gd-cell w-date" title={task.fin}>{task.fin}</div>
            
            {/* Dato corregido: sec_dependenciaid */}
            <div className="gd-cell w-dep" title={`Dependencia: ${task.depName}`}>{task.depName}</div>

            <div className="gd-cell w-num" title="Esfuerzo Estimado">{task.esfuerzo}</div>
            <div className="gd-cell w-num" title="Horas Imputadas">{task.imputadas}</div>
            
            <div className="gd-cell w-prog" title={`Progreso: ${task.progreso}%`}>
                <div className="prog-bar-container">
                    <div className="prog-bar-fill" style={{ width: `${task.progreso}%` }}></div>
                </div>
                <span className="lbl-percent">{task.progreso}%</span>
            </div>

            <div className="gd-cell w-stat" title={task.estado}>
                <span className={`pill ${task.estado.toLowerCase().includes('completada') ? 's-done' : 's-pend'}`}>
                    {task.estado}
                </span>
            </div>
        </div>
    );
};

export class HelloWorld extends React.Component<IHelloWorldProps, IHelloWorldState> {
    constructor(props: IHelloWorldProps) {
        super(props);
        this.state = { collapsedParents: [] };
    }

    private toggleParent = (id: string) => {
        this.setState(prevState => {
            const list = prevState.collapsedParents;
            return list.includes(id) ? { collapsedParents: list.filter(x => x !== id) } : { collapsedParents: [...list, id] };
        });
    }

    public render(): React.ReactNode {
        const visibleTasks = this.props.tasks.filter(t => {
            if (!t.parentId) return true;
            return !this.state.collapsedParents.includes(t.parentId);
        });

        return (
            <div className="pcf-container">
                <div className="v-tag">v{this.props.version}</div>
                <div className="header-actions">
                    <button className="btn-new" onClick={this.props.onCreateTask}>+ Crear Tarea</button>
                    <span style={{fontSize:'10px', marginLeft:'10px', color:'#666'}}>
                        💡 Arrastra una tarea sobre otra para asignarla como hija.
                    </span>
                </div>
                
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
                            isCollapsed={this.state.collapsedParents.includes(task.id)}
                            onToggle={this.toggleParent}
                            onOpen={this.props.onOpenTask}
                            webAPI={this.props.context.webAPI}
                            onDropAction={this.props.onReparentTask}
                        />
                    ))}
                </div>
            </div>
        );
    }
}