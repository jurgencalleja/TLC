/**
 * Helm Chart Generator
 * Generates Helm chart files for Kubernetes deployments
 */

/**
 * Generate Chart.yaml content
 * @param {Object} options - Chart options
 * @param {string} options.name - Chart name
 * @param {string} options.version - Chart version
 * @returns {string} Chart.yaml content
 */
export function generateChartYaml(options) {
  const { name, version = '0.1.0', description = '', appVersion = '1.0.0' } = options;
  return `apiVersion: v2
name: ${name}
version: ${version}
description: ${description || `A Helm chart for ${name}`}
appVersion: "${appVersion}"
type: application
`;
}

/**
 * Generate values.yaml with secure defaults
 * @param {Object} options - Values options
 * @param {string} options.image - Container image
 * @returns {string} values.yaml content
 */
export function generateValuesYaml(options) {
  const { image = 'nginx:latest', replicaCount = 1 } = options;
  return `# Default values for chart
replicaCount: ${replicaCount}

image:
  repository: ${image.split(':')[0]}
  tag: ${image.split(':')[1] || 'latest'}
  pullPolicy: IfNotPresent

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: ""
  hosts: []
  tls: []
`;
}

/**
 * Generate deployment template
 * @param {Object} options - Template options
 * @returns {string} Deployment template content
 */
export function generateDeploymentTemplate(options) {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "chart.selectorLabels" . | nindent 8 }}
    spec:
      securityContext:
        {{- toYaml .Values.securityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
`;
}

/**
 * Generate service template
 * @param {Object} options - Template options
 * @returns {string} Service template content
 */
export function generateServiceTemplate(options) {
  return `apiVersion: v1
kind: Service
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "chart.selectorLabels" . | nindent 4 }}
`;
}

/**
 * Generate ingress template
 * @param {Object} options - Template options
 * @returns {string} Ingress template content
 */
export function generateIngressTemplate(options) {
  return `{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "chart.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
`;
}

/**
 * Create a Helm generator instance
 * @returns {Object} Helm generator with methods
 */
export function createHelmGenerator() {
  return {
    generateChart: (options) => generateChartYaml(options),
    generateValues: (options) => generateValuesYaml(options),
    generateDeployment: (options) => generateDeploymentTemplate(options),
    generateService: (options) => generateServiceTemplate(options),
    generateIngress: (options) => generateIngressTemplate(options),
    generateAll: (options) => ({
      'Chart.yaml': generateChartYaml(options),
      'values.yaml': generateValuesYaml(options),
      'templates/deployment.yaml': generateDeploymentTemplate(options),
      'templates/service.yaml': generateServiceTemplate(options),
      'templates/ingress.yaml': generateIngressTemplate(options),
    }),
  };
}
