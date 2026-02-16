/* eslint-disable */
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { HelloWorld, IHelloWorldProps, ITaskItem } from "./HelloWorld";
import * as React from "react";

export class Task implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    public init(): void {}

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const ds = context.parameters.sampleDataSet;
        
        const depFechasRaw = context.parameters.dependencia_fechas?.raw;
        const dependFechas = depFechasRaw !== false; 
        
        let rawItems: ITaskItem[] = (ds.sortedRecordIds || []).map((id) => {
            const record = ds.records[id] as any;
            
            const getLookupVal = (field: string): {id?: string, name: string} => {
                const raw = record.getValue(field);
                let resId: string | undefined = undefined;
                let resName = "";
                if (raw) {
                    if (Array.isArray(raw) && raw.length > 0) {
                        resId = raw[0].id; resName = raw[0].name;
                    } else if (typeof raw === 'object') {
                        if (raw.id && raw.id.guid) resId = raw.id.guid;
                        else if (raw.id && typeof raw.id === 'string') resId = raw.id;
                        if (raw.name) resName = raw.name;
                    }
                }
                if (resId) resId = resId.replace(/[{}]/g, '').toLowerCase();
                return { id: resId, name: resName };
            };

            const parentData = getLookupVal("sec_tareaprincipalid");
            const depData = getLookupVal("sec_dependenciaid");

            return {
                id: id.replace(/[{}]/g, '').toLowerCase(), 
                originalId: id,
                idTarea: record.getFormattedValue("sec_idtarea"),
                nombre: record.getFormattedValue("sec_name"),
                inicio: record.getFormattedValue("sec_inicio"),
                fin: record.getFormattedValue("sec_fin"),
                rawInicio: record.getValue("sec_inicio") ? new Date(record.getValue("sec_inicio")) : null,
                rawFin: record.getValue("sec_fin") ? new Date(record.getValue("sec_fin")) : null,
                esfuerzo: record.getFormattedValue("sec_esfuerzoestimado"),
                imputadas: record.getFormattedValue("sec_horasimputadas"),
                progreso: parseInt(record.getFormattedValue("sec_progreso")) || 0,
                estado: record.getFormattedValue("statuscode"),
                parentId: parentData.id,
                depName: depData.name,
                depId: depData.id,
                entityName: record.getNamedReference().entityType,
                virtualNro: 0
            };
        });

        const parents = rawItems.filter(x => !x.parentId);
        const children = rawItems.filter(x => x.parentId);
        parents.forEach((parent, index) => { parent.virtualNro = index + 1; });
        parents.forEach(parent => {
            const myChildren = children.filter(c => c.parentId === parent.id);
            myChildren.forEach((child, idx) => { child.virtualNro = parent.virtualNro + ((idx + 1) / 100); });
        });
        children.forEach(child => { if (child.virtualNro === 0) child.virtualNro = 9999; });

        const sortedItems = [...parents, ...children].sort((a, b) => a.virtualNro - b.virtualNro);

        const props: IHelloWorldProps = { 
            tasks: sortedItems, 
            version: "1.9.18",
            dependenciaFechas: dependFechas, 
            context: context, 
            onOpenTask: (etn, id) => {
                const nav = context.navigation as any;
                if (nav.navigateTo) {
                    const pageInput = {
                        pageType: "entityrecord",
                        entityName: etn,
                        entityId: id
                    };
                    const navOptions = {
                        target: 2, 
                        position: 1, 
                        width: { value: 70, unit: "%" },
                        height: { value: 80, unit: "%" }
                    };
                    nav.navigateTo(pageInput, navOptions).then(
                        () => { ds.refresh(); },
                        (err: any) => { console.error("Error opening modal", err); }
                    );
                } else {
                    void context.navigation.openForm({ entityName: etn, entityId: id }).then(
                        () => { 
                            ds.refresh(); 
                        }, 
                        (err: any) => { console.error("Error opening modal", err); }
                    );
                }
            },
            onCreateTask: () => {
                const pageContext = context.mode as any;
                const formParams: any = {};
                if (pageContext.contextInfo?.entityId) {
                    formParams["sec_proyectoid"] = [{ 
                        id: pageContext.contextInfo.entityId, 
                        entityType: pageContext.contextInfo.entityTypeName, 
                        name: pageContext.contextInfo.entityRecordName 
                    }];
                }
                void context.navigation.openForm({ entityName: "sec_tarea", useQuickCreateForm: true }, formParams);
            },
            onUpdateProgreso: (id, val) => { 
                const data = { "sec_progreso": val };
                context.webAPI.updateRecord("sec_tarea", id, data).then(
                    () => { ds.refresh(); },
                    (err) => { context.navigation.openErrorDialog({ message: "Error actualizando progreso: " + err.message }); }
                );
            },
            onReparentTask: (childId, newParentId) => {
                const data = { "sec_tareaprincipalid@odata.bind": `/sec_tareas(${newParentId})` };
                context.webAPI.updateRecord("sec_tarea", childId, data).then(
                    () => { ds.refresh(); },
                    (err) => { context.navigation.openErrorDialog({ message: "Error: " + err.message }); }
                );
            },
            onUnparentTask: (childId) => {
                const data = { "sec_tareaprincipalid": null };
                context.webAPI.updateRecord("sec_tarea", childId, data).then(
                    () => { ds.refresh(); },
                    (err) => { context.navigation.openErrorDialog({ message: "Error: " + err.message }); }
                );
            },
            onUpdateDependency: (taskId, dependencyId) => {
                let data: any = {};
                if (dependencyId) {
                    const cleanId = dependencyId.replace(/[{}]/g, '');
                    data["sec_dependenciaid@odata.bind"] = `/sec_tareas(${cleanId})`;
                } else {
                    data["sec_dependenciaid"] = null;
                }
                context.webAPI.updateRecord("sec_tarea", taskId, data).then(
                    () => { console.log("Dependencia guardada OK"); },
                    (err) => { context.navigation.openErrorDialog({ message: "Error guardando dependencia: " + err.message }); }
                );
            },
            onUpdateDates: (id, start, end) => {
                const formatDate = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const data = {
                    "sec_inicio": formatDate(start),
                    "sec_fin": formatDate(end)
                };

                context.webAPI.updateRecord("sec_tarea", id, data).then(
                    () => { ds.refresh(); },
                    (err) => { context.navigation.openErrorDialog({ message: "Error actualizando fechas: " + err.message }); }
                );
            }
        };
        
        return React.createElement(HelloWorld, props);
    }

    public getOutputs(): IOutputs { return {}; }
    public destroy(): void {}
}