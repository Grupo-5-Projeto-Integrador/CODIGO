package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	Password     string    `json:"-"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"created_at"`
}

type Store struct {
	ID        int       `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Segment   string    `json:"segment,omitempty"`
	Email     string    `json:"email,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

type AuditEntry struct {
	ID           string `json:"id"`
	User         string `json:"user"`
	UserInitials string `json:"userInitials"`
	UserRole     string `json:"userRole"`
	Timestamp    string `json:"timestamp"`
	Action       string `json:"action"`
	Type         string `json:"type"`
}

type EmployeeContact struct {
	StoreID   int    `json:"storeId"`
	StoreName string `json:"storeName"`
	Name      string `json:"name"`
	Contact   string `json:"contact"`
}

type Claim struct {
	ID                  string            `json:"id"`
	Store               string            `json:"store"`
	Type                string            `json:"type"`
	OtherType           *string           `json:"otherType,omitempty"`
	Severity            string            `json:"severity"`
	Status              string            `json:"status"`
	Date                string            `json:"date"`
	Description         string            `json:"description"`
	ResponsibleArea     *string           `json:"responsibleArea,omitempty"`
	TenantNotified      bool              `json:"tenantNotified"`
	ResponsibleNotified bool              `json:"responsibleNotified"`
	EmployeeName        *string           `json:"employeeName,omitempty"`
	EmployeeContact     *string           `json:"employeeContact,omitempty"`
	EmployeeContacts    []EmployeeContact `json:"employeeContacts"`
	Status2             string            `json:"-"`
	Files               []string          `json:"files"`
	IrregularPolicy     bool              `json:"irregularPolicy"`
	AuditTrail          []AuditEntry      `json:"auditTrail"`
	CompensationAmount  float64           `json:"compensationAmount"`
	Responsibility      string            `json:"responsibility"`
	CreatedAt           time.Time         `json:"createdAt"`
	ResolvedAt          *time.Time        `json:"resolvedAt,omitempty"`
}

type Notification struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"`
	Priority  string    `json:"priority"`
	ClaimID   *string   `json:"claim_id,omitempty"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type DashboardStats struct {
	Active       int64           `json:"active"`
	Last12Months int64           `json:"last12Months"`
	TotalStores  int64           `json:"totalStores"`
	VolumeMensal []MonthCount    `json:"volumeMensal"`
	IndiceMensal []MonthRate     `json:"indiceMensal"`
	ByStatus     []StatusCount   `json:"byStatus"`
	BySeverity   []SeverityCount `json:"bySeverity"`
	ByType       []TypeCount     `json:"byType"`
	TopStores    []StoreCount    `json:"topStores"`
}

type MonthCount struct {
	Mes       string `json:"mes"`
	Sinistros int64  `json:"sinistros"`
}

type MonthRate struct {
	Mes    string  `json:"mes"`
	Indice float64 `json:"indice"`
}

type StatusCount struct {
	Status string `json:"status"`
	Total  int64  `json:"total"`
}

type SeverityCount struct {
	Severity string `json:"severity"`
	Total    int64  `json:"total"`
}

type TypeCount struct {
	Type  string `json:"type"`
	Total int64  `json:"total"`
}

type StoreCount struct {
	Store string `json:"store"`
	Total int64  `json:"total"`
}
